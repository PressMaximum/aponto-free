<?php
/**
 * Onboarding wizard service layer.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Onboarding;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\LockFactory;
use Aponto\Database\TransactionGuard;
use Aponto\Rest\Args;
use Aponto\Rest\Data\ScheduleGateway;
use Aponto\Rest\Data\ServiceGateway;
use Aponto\Rest\Data\StaffGateway;
use Aponto\Support\Clock;
use Aponto\Support\Settings;

/**
 * Performs every write the onboarding wizard needs (SPEC-P1 §4) as a plain PHP
 * service — NOT new REST routes (rest-contract is frozen). The admin surface
 * ({@see WizardPage}) drives these over admin-ajax; the integration suite drives
 * them directly.
 *
 * The wizard writes `business.*` settings (never a location — Q2a fresh install is
 * 0 locations), business-hours rows as `staff_id = 0` (bypassing the per-staff
 * schedule route, which 404s on staff 0), staff #1, and the first service — then
 * connects that service to staff so it is immediately bookable, and creates the
 * booking page with the exact block serialization.
 */
final class WizardService {

	/**
	 * Option holding the created booking page id (standalone, so the
	 * full-replacement settings PUT can never reset it).
	 */
	public const BOOKING_PAGE_OPTION = 'aponto_booking_page_id';

	/**
	 * The exact block serialization written into the booking page (asserted by the
	 * acceptance test).
	 */
	public const BLOCK_MARKUP = '<!-- wp:aponto/booking-form {"align":"wide"} /-->';

	/**
	 * The schema's `staff.email` column width, mirrored from {@see \Aponto\Rest\Args::MAX_191} so the
	 * wizard refuses an over-long address instead of letting MySQL truncate it.
	 */
	private const MAX_EMAIL = 191;

	/**
	 * The schema's `staff.name` column width — same mirror, same reason.
	 */
	private const MAX_NAME = 191;

	/**
	 * Construct the wizard service.
	 *
	 * @param \wpdb    $wpdb     Database handle.
	 * @param Settings $settings Core settings.
	 * @param Funnel   $funnel   Onboarding funnel.
	 * @param Clock    $clock    Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Settings $settings,
		private Funnel $funnel,
		private Clock $clock
	) {}

	/**
	 * Bootstrap state for the wizard UI.
	 *
	 * @return array<string, mixed>
	 */
	public function state(): array {
		return array(
			'funnel'       => $this->funnel->all(),
			'complete'     => $this->funnel->isComplete(),
			'resumeStep'   => $this->funnel->resumeStep(),
			'staffCount'   => $this->staffGateway()->count(),
			'serviceCount' => $this->serviceCount(),
			'bookingPage'  => $this->bookingPage(),
			'prefill'      => $this->prefill(),
		);
	}

	/**
	 * Persist the wizard resume cursor (C10). The client sends its current 0-based step index on
	 * every advance and 0 on "Start over"; {@see Funnel::setResumeStep()} clamps negatives.
	 *
	 * @param int $step 0-based step index.
	 */
	public function saveStep( int $step ): void {
		$this->funnel->setResumeStep( $step );
	}

	/**
	 * Detect-and-confirm prefill from WP options + settings (§4 step 2/4).
	 *
	 * @return array<string, mixed>
	 */
	public function prefill(): array {
		return array(
			// Decoded so an ampersand in the site title prefills the input as "&", not "&amp;"
			// (fleet-r1 Fix 3; finding U1 BUG-1) — the value is re-escaped on save/render.
			'siteTitle'   => Settings::blogName(),
			'adminEmail'  => (string) get_option( 'admin_email' ),
			'timezone'    => self::prefillTimezone( (string) wp_timezone_string() ),
			'dateFormat'  => (string) get_option( 'date_format' ),
			'timeFormat'  => (string) get_option( 'time_format' ),
			'weekStart'   => (int) get_option( 'start_of_week' ),
			// Prefill the currency from the WP locale (a neutral, worldwide locale→currency map,
			// USD fallback — Aponto is global, no regional bias); the admin confirms/changes it.
			'currency'    => Settings::validateCurrency( $this->settings->get( 'currency' ) ),
			'business'    => array(
				'name'    => (string) $this->settings->get( 'business.name' ),
				'address' => (string) $this->settings->get( 'business.address' ),
				'phone'   => (string) $this->settings->get( 'business.phone' ),
			),
			'currentUser' => $this->currentUserPrefill(),
		);
	}

	/**
	 * The prefilled business timezone, as something the timezone select can actually preselect.
	 *
	 * `wp_timezone_string()` answers with a UTC OFFSET (`+00:00`, `-05:30`) on a site that never
	 * picked a city, and an offset is not in `timezone_identifiers_list()`. The select then fell
	 * back to its FIRST option — Africa/Abidjan, alphabetically first — while the wizard's state
	 * still held the offset: the screen named a country the business is not in (beta QA
	 * 2026-08-01). A ZERO offset has an exact IANA equivalent that reads as a deliberate choice,
	 * so it becomes `UTC`. A non-zero offset has no unambiguous city (`+07:00` is Bangkok,
	 * Jakarta, Novosibirsk… with different DST rules), so it is handed through untouched and the
	 * client keeps it selectable as its own option rather than guessing on the owner's behalf.
	 *
	 * Deliberately static and pure (no WordPress) so the rule is unit-testable on the host.
	 *
	 * @param string $wp_timezone Result of `wp_timezone_string()`.
	 */
	public static function prefillTimezone( string $wp_timezone ): string {
		$value = trim( $wp_timezone );
		if ( '' === $value ) {
			return 'UTC';
		}
		if ( 1 === preg_match( '/^[+-]?00:00$/', $value ) ) {
			return 'UTC';
		}

		return $value;
	}

	/**
	 * Step 2 — confirm business info. Writes `business.*` settings + formats + week
	 * start, and the business timezone (the WP site option, the availability
	 * engine's source). NEVER creates a location (Q2a).
	 *
	 * @param array<string, mixed> $data Field values.
	 */
	public function saveBusiness( array $data ): void {
		if ( array_key_exists( 'name', $data ) ) {
			$this->settings->update( 'business.name', (string) $data['name'] );
		}
		if ( array_key_exists( 'address', $data ) ) {
			$this->settings->update( 'business.address', (string) $data['address'] );
		}
		if ( array_key_exists( 'phone', $data ) ) {
			$this->settings->update( 'business.phone', (string) $data['phone'] );
		}
		// Persist the store currency HERE (business step) so it is committed before the first
		// service saves a price — otherwise price_minor would scale against the wrong currency's
		// minor unit (e.g. a 0-decimal VND amount scaled ×100 as if it were USD). Settings::update
		// normalizes via validateCurrency (invalid → USD).
		//
		// Back-navigation guard (Codex review item 1, BLOCKER): the wizard is a guided loop — the
		// admin can create the first service (step 5) and then go BACK to this step and change the
		// currency. Stored `price_minor` values would then be read at the NEW currency's exponent
		// (a $25.00 → 2500 minor would surface as ₫2,500 — scale corruption). Chosen approach:
		// RE-SCALE every stored service price by the exponent delta so the MAJOR-UNIT NUMERAL the
		// admin typed is preserved exactly (25.00 USD ⇄ ₫25 ⇄ KD 25.000). This keeps the guided
		// flow editable (no dead-end block) and is deterministic/reversible; it is a numeral
		// reinterpretation, NOT an FX conversion (FX is out of scope pre-beta). Orders cannot
		// exist yet in the wizard flow, so services are the only priced rows. The Settings surface
		// takes the other leg: a confirm warning before saving a currency change (SettingsApp).
		if ( array_key_exists( 'currency', $data ) ) {
			$new_currency = Settings::validateCurrency( (string) $data['currency'] );
			$old_currency = Settings::validateCurrency( $this->settings->get( 'currency' ) );
			$this->settings->update( 'currency', $new_currency );
			if ( $new_currency !== $old_currency ) {
				$this->rescaleServicePrices( $old_currency, $new_currency );
			}
		}
		if ( array_key_exists( 'dateFormat', $data ) ) {
			$this->settings->update( 'date_format', (string) $data['dateFormat'] );
		}
		if ( array_key_exists( 'timeFormat', $data ) ) {
			$this->settings->update( 'time_format', (string) $data['timeFormat'] );
		}
		if ( array_key_exists( 'weekStart', $data ) ) {
			$this->settings->update( 'week_starts_on', (int) $data['weekStart'] );
		}
		$tz = isset( $data['timezone'] ) ? (string) $data['timezone'] : '';
		if ( '' !== $tz && '' === Args::checkTimezone( $tz ) ) {
			update_option( 'timezone_string', Args::canonicalizeTimezone( $tz ) );
		}
	}

	/**
	 * Rows the hours step cannot store AT ALL, by their POSITION in the posted grid (SPEC-P1 §4
	 * step 3). The structural rule that runs BEFORE {@see self::invalidHourDays()}, which only
	 * judges the range of rows it can already read.
	 *
	 * A row is unusable when it is not an array, when its `weekday` is missing / not a whole number
	 * / outside ISO 1..7, when the same weekday is posted twice (the full-grid replace would store
	 * two rows for one day), when `open` is not a scalar, or when `start`/`end` are present but not
	 * whole numbers. Every one of those used to be `continue`d past in {@see self::saveHours()} —
	 * and because {@see ScheduleGateway::replace()} REPLACES the entire `staff_id = 0` grid, a
	 * payload of `days=[valid Monday, "bad-row"]` erased Tuesday…Sunday with nothing on screen
	 * (Codex review item 2). The wizard's own client always posts seven well-formed rows, so
	 * anything else is crafted or corrupted and the whole write is refused.
	 *
	 * Deliberately pure (no WordPress, no i18n, no state) so the rule is unit-testable on the host.
	 *
	 * @param array<mixed> $days Weekly grid exactly as posted.
	 * @return list<int> 0-based positions of unusable rows; empty when every row is readable.
	 */
	public static function malformedHourRows( array $days ): array {
		$bad  = array();
		$seen = array();
		foreach ( array_values( $days ) as $index => $day ) {
			if ( ! is_array( $day ) || ! self::isWholeNumber( $day['weekday'] ?? null ) ) {
				$bad[] = $index;
				continue;
			}
			$weekday = (int) $day['weekday'];
			if ( $weekday < 1 || $weekday > 7 || isset( $seen[ $weekday ] ) ) {
				$bad[] = $index;
				continue;
			}
			$seen[ $weekday ] = true;
			if ( array_key_exists( 'open', $day ) && null !== $day['open'] && ! is_scalar( $day['open'] ) ) {
				$bad[] = $index;
				continue;
			}
			foreach ( array( 'start', 'end' ) as $key ) {
				if ( array_key_exists( $key, $day ) && null !== $day[ $key ] && ! self::isWholeNumber( $day[ $key ] ) ) {
					$bad[] = $index;
					continue 2;
				}
			}
		}

		return $bad;
	}

	/**
	 * Whether the posted grid covers the WHOLE week — exactly seven rows carrying ISO weekdays
	 * 1..7, each once (SPEC-P1 §4 step 3).
	 *
	 * The companion rule to {@see self::malformedHourRows()}, which only judges the rows it was
	 * GIVEN. Completeness is a separate obligation because {@see ScheduleGateway::replace()}
	 * replaces the entire `staff_id = 0` grid: a payload of `days=[valid Monday]` is perfectly
	 * well-formed and used to pass, and the replace then wiped Tuesday…Sunday with nothing on
	 * screen (Codex final review, MAJOR 1). The wizard's own client always posts seven rows — even
	 * for a fully-closed week, where a closed day is an explicit `open:false` marker, not an
	 * omission (`assets/src/wizard/index.js`) — so a partial grid is crafted or corrupted and the
	 * whole write is refused.
	 *
	 * Extra rows are refused by the count for the same reason: with the weekdays unique and in
	 * range, an eighth row can only be a duplicate or out-of-range day, and the grid the step shows
	 * must be exactly the grid that gets stored.
	 *
	 * Deliberately pure (no WordPress, no i18n, no state) so the rule is unit-testable on the host.
	 *
	 * @param array<mixed> $days Weekly grid exactly as posted.
	 */
	public static function hourGridIsComplete( array $days ): bool {
		if ( 7 !== count( $days ) ) {
			return false;
		}

		$seen = array();
		foreach ( $days as $day ) {
			if ( ! is_array( $day ) || ! self::isWholeNumber( $day['weekday'] ?? null ) ) {
				return false;
			}
			$seen[ (int) $day['weekday'] ] = true;
		}

		ksort( $seen );

		return array( 1, 2, 3, 4, 5, 6, 7 ) === array_keys( $seen );
	}

	/**
	 * Whether a posted value is a whole number: an int, an integral float (JSON `540.0`), or a
	 * digits-only string (`"540"`). Booleans, `"09:00"`, `1.5` and arrays are not.
	 *
	 * @param mixed $value Raw posted value.
	 */
	private static function isWholeNumber( mixed $value ): bool {
		if ( is_int( $value ) ) {
			return true;
		}
		if ( is_float( $value ) ) {
			return is_finite( $value ) && floor( $value ) === $value;
		}
		if ( is_string( $value ) ) {
			return 1 === preg_match( '/^-?\d+$/', trim( $value ) );
		}

		return false;
	}

	/**
	 * ISO weekdays whose OPEN range is not usable, in the order they were posted (SPEC-P1 §4 step 3).
	 *
	 * A range is usable when `0 <= start < end <= 1440` — the same bounds the REST schedule route
	 * enforces per period ({@see \Aponto\Rest\Controller\ScheduleController::periods()}). Days that
	 * are closed are not this rule's business, and rows it cannot read (unknown weekday, junk shape)
	 * are not either: {@see self::malformedHourRows()} refuses those first.
	 *
	 * Deliberately pure (no WordPress, no i18n, no state) so the rule is unit-testable on the host;
	 * {@see self::saveHours()} owns the messages and the refusal.
	 *
	 * @param array<mixed> $days Weekly grid as posted.
	 * @return list<int> Offending ISO weekdays (1=Mon … 7=Sun); empty when the grid is usable.
	 */
	public static function invalidHourDays( array $days ): array {
		$invalid = array();
		foreach ( $days as $day ) {
			if ( ! is_array( $day ) ) {
				continue;
			}
			$weekday = (int) ( $day['weekday'] ?? 0 );
			if ( $weekday < 1 || $weekday > 7 || empty( $day['open'] ) ) {
				continue;
			}
			$start = (int) ( $day['start'] ?? 540 );
			$end   = (int) ( $day['end'] ?? 1020 );
			if ( $start < 0 || $end > 1440 || $start >= $end ) {
				$invalid[] = $weekday;
			}
		}

		return $invalid;
	}

	/**
	 * Step 3 — business hours as `staff_id = 0` rows (§1.3). A day with `open =
	 * false` is stored as a closed marker; staff inherit these rows.
	 *
	 * REFUSES the whole write when any open day's range is inverted or out of bounds (beta report
	 * 2026-08-01, QA A). Such a day used to be `continue`d past: no row reached
	 * {@see ScheduleGateway::replace()}, which REPLACES the entire `staff_id = 0` grid, so Monday
	 * 17:00–09:00 (the classic am/pm slip) came back as "Closed" with no error anywhere on screen.
	 * Silently discarding the founder's own hours is worse than a rejected step, and the whole grid
	 * is refused rather than partially applied so the saved week always matches what the step shows.
	 *
	 * The same refusal covers rows the step cannot even READ ({@see self::malformedHourRows()}):
	 * the row-build loop below skipped them too, so a crafted `days=[valid Monday, "bad-row"]`
	 * replaced the whole week with a single Monday (Codex review item 2). Structure is checked
	 * first, because a row whose weekday is unreadable cannot be reported per-day.
	 *
	 * And it covers an INCOMPLETE grid ({@see self::hourGridIsComplete()}): a payload carrying only
	 * Monday is well-formed, so it used to pass structure and range and then have `replace()` erase
	 * Tuesday…Sunday — the same silent wipe by a different door (Codex final review, MAJOR 1).
	 *
	 * @param array<mixed> $days Weekly grid.
	 * @throws WizardValidationException When a row is unreadable, the grid is not the whole week, or an open day's range is not `0 <= start < end <= 1440`.
	 */
	public function saveHours( array $days ): void {
		// An EMPTY grid is the same silent wipe in its purest form: the step always posts seven
		// rows, so `days = []` (or a `days` key that was not an array at all — see
		// WizardPage::handleAjax) can only be crafted or corrupted, and replacing with zero rows
		// would delete every business-hours row the site had. (The completeness rule below also
		// refuses it; the explicit check keeps the purest case obvious at the call site.)
		//
		// Order matters: structure first (a row whose weekday is unreadable cannot be counted),
		// then completeness, then the per-day range rule.
		if ( array() === $days || array() !== self::malformedHourRows( $days ) || ! self::hourGridIsComplete( $days ) ) {
			$message = __( 'Those business hours could not be read. Reload this page and set your hours again.', 'aponto' );

			// Not keyed by weekday: the offending rows are exactly the ones whose day is unknown,
			// so the client shows the step-level notice (WizardPage::handleAjax → data.message).
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Localized copy for the JSON error payload (WizardPage::handleAjax), never echoed as markup.
			throw new WizardValidationException( $message, array( 'days' => $message ) );
		}

		$invalid = self::invalidHourDays( $days );
		if ( array() !== $invalid ) {
			$fields = array();
			foreach ( $invalid as $weekday ) {
				// Keyed by ISO weekday so the client can mark the offending DAY inline; the row it
				// belongs to already carries the weekday's name.
				$fields[ (string) $weekday ] = __( 'The end time must be after the start time.', 'aponto' );
			}

			$message = __( 'Some business hours are invalid. Check the highlighted days and try again.', 'aponto' );

			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Localized copy for the JSON error payload (WizardPage::handleAjax), never echoed as markup.
			throw new WizardValidationException( $message, $fields );
		}

		// Every row reaching here is readable and in range — both refusals above are unconditional,
		// so this loop can no longer drop a row from a grid it is about to REPLACE.
		$rows = array();
		foreach ( $days as $day ) {
			if ( ! is_array( $day ) ) {
				continue; // Unreachable: malformedHourRows() already refused the write.
			}
			$weekday = (int) ( $day['weekday'] ?? 0 );
			if ( empty( $day['open'] ) ) {
				$rows[] = array(
					'weekday'       => $weekday,
					'date_override' => null,
					'start_minute'  => 0,
					'end_minute'    => 0,
				);
				continue;
			}
			$rows[] = array(
				'weekday'       => $weekday,
				'date_override' => null,
				'start_minute'  => (int) ( $day['start'] ?? 540 ),
				'end_minute'    => (int) ( $day['end'] ?? 1020 ),
			);
		}

		$this->scheduleGateway()->replace( 0, 0, 0, $rows );
	}

	/**
	 * Whether the staff email as posted is acceptable (SPEC-P1 §4 step 4).
	 *
	 * BLANK is accepted: the field is optional in this step (the step itself is skippable, and the
	 * owner-alert address falls back to `admin_email`). Anything else must be a real address —
	 * `not-an-email` used to be accepted by both sides and then sanitized away to '' (beta report
	 * 2026-08-01, QA B), which silently costs the owner every booking notification.
	 *
	 * WordPress's own {@see is_email()} is the authority, exactly as {@see \Aponto\Rest\Args::checkEmail()}
	 * uses it for the staff REST route, so the wizard and the editor accept the same set of addresses.
	 * The length bound is checked first, which keeps the over-long case testable without WordPress.
	 *
	 * @param mixed $raw Raw `email` field as posted.
	 */
	public static function staffEmailAccepted( mixed $raw ): bool {
		if ( null === $raw ) {
			return true;
		}
		if ( ! is_scalar( $raw ) ) {
			return false;
		}
		$email = trim( (string) $raw );
		if ( '' === $email ) {
			return true;
		}

		return mb_strlen( $email ) <= self::MAX_EMAIL && false !== is_email( $email );
	}

	/**
	 * The refusal message for the staff name as posted, or '' when it is usable
	 * (SPEC-P1 §4 step 4).
	 *
	 * BLANK IS REFUSED even though the step is skippable, because skipping the step means NOT
	 * POSTING it: the Skip button navigates to the next step and `do=staff` is never sent (and the
	 * whole-wizard `do=skip` runs {@see self::autoCreateOwnerStaff()}, which never touches an
	 * existing row). Posting `{"name":""}` is therefore always a real save — and on a re-run it took the
	 * UPDATE branch below and blanked the existing staff row's name (beta report 2026-08-02). A
	 * staff row without a name is never legitimate: it is what the calendar, the booking form and
	 * every notification call the provider.
	 *
	 * Same shape, same bound and the SAME msgids as {@see \Aponto\Rest\Args::checkName()}, so the
	 * wizard and the staff editor accept exactly the same set of names and say the same thing when
	 * they refuse.
	 *
	 * @param mixed $raw Raw `name` field as posted.
	 * @return string Localized refusal, or '' when acceptable.
	 */
	public static function staffNameRefusal( mixed $raw ): string {
		if ( ! is_scalar( $raw ) ) {
			return __( 'A name is required.', 'aponto' );
		}
		$name = trim( (string) $raw );
		if ( '' === $name ) {
			return __( 'A name is required.', 'aponto' );
		}
		if ( mb_strlen( $name ) > self::MAX_NAME ) {
			return __( 'This name is too long.', 'aponto' );
		}

		return '';
	}

	/**
	 * Step 4 — staff #1 (§4). Creates on first run, otherwise updates the existing
	 * first staff (Free allows exactly one). No per-staff schedule rows: staff
	 * inherit the `staff_id = 0` business hours.
	 *
	 * @param array<string, mixed> $data `{name, email}`.
	 * @return int Staff id.
	 * @throws WizardValidationException When the name is missing/over-long, or a non-blank email is
	 *                                   not a valid address (QA B).
	 * @throws \RuntimeException When the create lock is contended/lost or the insert failed (retryable; no row exists).
	 */
	public function saveStaff( array $data ): int {
		$refusal = self::staffNameRefusal( $data['name'] ?? '' );
		if ( '' === $refusal && '' === trim( sanitize_text_field( (string) ( $data['name'] ?? '' ) ) ) ) {
			// A name that passes the raw check but sanitizes to nothing (markup only) is still
			// no name — and it is the sanitized value that would have been written.
			$refusal = __( 'A name is required.', 'aponto' );
		}
		if ( '' !== $refusal ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Localized copy for the JSON error payload (WizardPage::handleAjax), never echoed as markup.
			throw new WizardValidationException( $refusal, array( 'name' => $refusal ) );
		}

		if ( ! self::staffEmailAccepted( $data['email'] ?? '' ) ) {
			$message = __( 'Enter a valid email address, or leave it blank.', 'aponto' );

			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Localized copy for the JSON error payload (WizardPage::handleAjax), never echoed as markup.
			throw new WizardValidationException( $message, array( 'email' => $message ) );
		}

		$name   = sanitize_text_field( (string) ( $data['name'] ?? '' ) );
		$email  = sanitize_email( (string) ( $data['email'] ?? '' ) );
		$fields = array(
			'name'  => $name,
			'email' => $email,
		);

		// On Free the single staff member IS the owner, so the email typed here is where booking
		// alerts should go. Mirror it into `business.email` (the alert recipient) so the owner's
		// wizard email is used instead of a leftover WP admin email (fleet-r1 Fix 2; finding U1
		// BUG-3) — but ONLY while the setting is still empty: an alerts address the owner already
		// configured in Settings is never silently overwritten by a wizard re-run (r1 review
		// item 3). A blank email leaves the fallback to admin_email.
		if ( '' !== $email && false !== is_email( $email )
			&& '' === trim( (string) $this->settings->get( 'business.email' ) ) ) {
			$this->settings->update( 'business.email', $email );
		}

		$first = $this->firstStaffId();
		if ( $first > 0 ) {
			$this->staffGateway()->update( $first, $fields );

			return $first;
		}

		// REST storage is uncapped (D-R42). The wizard nevertheless uses a neutral create-or-adopt
		// idempotency primitive so concurrent first-run submissions converge on the same owner row;
		// no plan count or entitlement participates in this operation (R2 #6).
		$outcome = $this->staffGateway()->createFirst(
			array(
				'type'     => 'human',
				'name'     => $name,
				'email'    => $email,
				'status'   => 'active',
				'position' => 1,
			)
		);
		if ( 'created' === $outcome['status'] ) {
			return $outcome['id'];
		}

		// `existing` = a concurrent request WON the race and its staff #1 exists — adopt + update it
		// (the wizard's create-or-update semantics). Every other non-created outcome (`locked`:
		// the lock was contended or lost; `failed`: the insert errored) means NOTHING usable exists —
		// fail-closed with a retryable error, NEVER a fabricated staff id (R2 #6).
		if ( 'existing' === $outcome['status'] && $outcome['id'] > 0 ) {
			$this->staffGateway()->update( $outcome['id'], $fields );

			return $outcome['id'];
		}

		throw new \RuntimeException( 'Aponto onboarding: staff creation is locked by another request; not created. Retry shortly.' );
	}

	/**
	 * Step 5 — first service (§4). Duration defaults to 60'; price is optional and
	 * given in the store currency's MAJOR unit. Creating the service fires
	 * `aponto_service_created` (the wizard-completed goal event) and is connected to
	 * every staff so it is immediately bookable.
	 *
	 * @param array<string, mixed> $data `{name, duration, price?}`.
	 * @return int Service id.
	 */
	public function saveService( array $data ): int {
		$service = array(
			'name'             => sanitize_text_field( (string) ( $data['name'] ?? '' ) ),
			'duration_minutes' => max( 5, min( 480, (int) ( $data['duration'] ?? 60 ) ) ),
			'status'           => 'active',
		);

		if ( isset( $data['price'] ) && '' !== (string) $data['price'] && is_numeric( $data['price'] ) ) {
			$service['price_minor'] = $this->priceToMinor( (float) $data['price'] );
		}

		$id = $this->serviceGateway()->create( $service );

		foreach ( $this->allStaffIds() as $staff_id ) {
			$this->connect( $staff_id, $id );
		}

		return $id;
	}

	/**
	 * Step 6 — create (or reuse) the booking page holding the exact block markup.
	 * Idempotent: an existing non-trashed page is returned as-is; a trashed page is
	 * replaced. Stamps `page_published`.
	 *
	 * Race guard (B2 review, #12 + Codex review): two concurrent callers (a
	 * double-submit, or two admins) would each read "no page" and each insert a
	 * draft. A short advisory lock serializes the create — FAIL-CLOSED: when
	 * `acquire()` times out we NEVER proceed unserialized; the caller gets an
	 * exception and retries (the winner's page is then found by the pre-check).
	 * Under the lock, the recorded id is re-read DIRECTLY from the DB — bypassing
	 * the stale per-process option cache the pre-check just primed (`notoptions`)
	 * — so a racer's page is reused instead of duplicated. Advisory locks are
	 * per-connection, so before the actual insert the pinned lock connection id is
	 * compared against the CURRENT connection (a wpdb auto-reconnect silently drops
	 * the lock — E1 pattern) and the create aborts on mismatch; release is likewise
	 * only issued on the connection that acquired.
	 *
	 * @param int $lock_timeout Seconds to wait for the create lock (0 = fail immediately).
	 * @return array<string, mixed>
	 * @throws \RuntimeException When the lock cannot be acquired/held or the page could not be created.
	 */
	public function createBookingPage( int $lock_timeout = 5 ): array {
		$existing = $this->existingBookingPage();
		if ( null !== $existing ) {
			// The wizard's "Create/Open booking page" button means go-live, so publish an existing
			// draft too — idempotent when already published (fleet-r1 Fix 4; finding U3 BUG-02).
			return $this->publishBookingPage( $existing );
		}

		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new LockFactory( $this->wpdb ) )->named( 'apt:' . $this->wpdb->prefix . ':booking_page' );
		if ( ! $lock->acquire( $lock_timeout ) ) {
			// FAIL-CLOSED: without the lock we cannot know whether a concurrent request is
			// mid-create — never continue unserialized.
			throw new \RuntimeException( 'Aponto onboarding: booking-page creation is locked by another request; not created. Retry shortly.' );
		}

		try {
			// Re-check under the lock against the DB truth (not the cache): a racer may have
			// created + recorded the page while we waited on the lock.
			$recorded = $this->recordedBookingPageId();
			if ( $recorded > 0 ) {
				$post = get_post( $recorded );
				if ( $post instanceof \WP_Post && 'trash' !== $post->post_status ) {
					// Resync the local option cache to the DB and return the racer's page.
					update_option( self::BOOKING_PAGE_OPTION, $recorded, false );

					return $this->pageInfo( $post, false );
				}
			}

			// Connection identity (E1): if wpdb reconnected since acquire, the lock is GONE
			// server-side even though this object still believes it holds it — abort instead of
			// writing unserialized.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				throw new \RuntimeException( 'Aponto onboarding: booking-page lock was lost (connection changed); not created. Retry shortly.' );
			}

			$id = wp_insert_post(
				array(
					'post_title'   => __( 'Book an appointment', 'aponto' ),
					// Publish immediately so visitors can reach the page — the wizard step is titled
					// "Publish your booking page" and stamps page_published (fleet-r1 Fix 4; finding
					// U3 BUG-02: it previously stayed a draft that 404'd for guests).
					'post_status'  => 'publish',
					'post_type'    => 'page',
					'post_content' => self::BLOCK_MARKUP,
				),
				true
			);

			if ( is_wp_error( $id ) || 0 === (int) $id ) {
				throw new \RuntimeException( 'Aponto onboarding: booking page could not be created.' );
			}

			update_option( self::BOOKING_PAGE_OPTION, (int) $id, false );
			$this->funnel->stamp( 'page_published' );

			return $this->pageInfo( get_post( (int) $id ), true );
		} finally {
			// Release only on the connection that acquired (RELEASE_LOCK on any other connection
			// is meaningless; a dropped connection's lock was already released server-side).
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}
	}

	/**
	 * Ensure an already-recorded booking page is published (promote a draft), then return its DTO.
	 * Idempotent: an already-published page is returned unchanged. `page_published` is stamped
	 * ONLY when the page really ends up published — a failed promote must not mark the funnel goal
	 * reached (r1 review item 5); the caller sees the true `status` and can retry.
	 *
	 * @param \WP_Post $post Existing (non-trashed) booking page.
	 * @return array<string, mixed>
	 */
	private function publishBookingPage( \WP_Post $post ): array {
		if ( 'publish' !== $post->post_status ) {
			$updated = wp_update_post(
				array(
					'ID'          => $post->ID,
					'post_status' => 'publish',
				),
				true
			);
			if ( ! is_wp_error( $updated ) && 0 !== (int) $updated ) {
				$refetched = get_post( $post->ID );
				if ( $refetched instanceof \WP_Post ) {
					$post = $refetched;
				}
			}
		}
		if ( 'publish' === $post->post_status ) {
			$this->funnel->stamp( 'page_published' );
		}

		return $this->pageInfo( $post, false );
	}

	/**
	 * The current booking page (null when none / trashed).
	 *
	 * @return array<string, mixed>|null
	 */
	public function bookingPage(): ?array {
		$post = $this->existingBookingPage();

		return null === $post ? null : $this->pageInfo( $post, false );
	}

	/**
	 * The recorded booking page post if it exists and is not trashed, else null (option-cache path).
	 */
	private function existingBookingPage(): ?\WP_Post {
		$id = (int) get_option( self::BOOKING_PAGE_OPTION, 0 );
		if ( $id <= 0 ) {
			return null;
		}
		$post = get_post( $id );
		if ( ! $post instanceof \WP_Post || 'trash' === $post->post_status ) {
			return null;
		}

		return $post;
	}

	/**
	 * The recorded booking-page id read STRAIGHT from the options table, bypassing the object cache.
	 * The pre-lock {@see self::existingBookingPage()} miss primes the `notoptions` cache, so an
	 * in-lock `get_option()` would still return stale — the race re-check must hit the DB.
	 */
	private function recordedBookingPageId(): int {
		$table = $this->wpdb->options;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Deliberate cache-bypassing read for the create race guard; bound via prepare().
		$value = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT option_value FROM {$table} WHERE option_name = %s LIMIT 1", self::BOOKING_PAGE_OPTION ) );

		return null === $value ? 0 : (int) $value;
	}

	/**
	 * Final step — the founder pressed "Finish setup" (SPEC-P1 §4 step 6).
	 *
	 * Stamps `wizard_completed` so {@see Funnel::isComplete()} releases the full Aponto menu even
	 * when the guided flow never created a service: `wizard_completed` was previously reachable ONLY
	 * as a side effect of the `aponto_service_created` goal event, so skipping step 5 left the funnel
	 * incomplete and {@see \Aponto\Admin\AdminPage::registerMenu()} kept the menu collapsed to the
	 * wizard forever — the founder finished the flow with no way out (beta report 2026-07-26).
	 *
	 * Idempotent ({@see Funnel::stamp()} is first-write-wins) and deliberately does NOT touch
	 * `resume_step`: the C10 resume cursor must survive so a later re-entry from Settings lands where
	 * the founder left off, not back at Welcome.
	 */
	public function finish(): void {
		$this->funnel->stamp( 'wizard_completed' );
	}

	/**
	 * Mark the wizard skipped (releases the collapsed setup menu).
	 *
	 * C12 (review F item 2 — orchestration moved SERVER-side): before stamping, auto-create the
	 * owner as staff #1 so the skipped install has a bookable provider and any service created
	 * afterwards autolinks to it — but NEVER touch an existing staff row (the guided
	 * {@see self::saveStaff()} update path would overwrite staff #1's name/email: data loss on
	 * skip). Best-effort and idempotent: a create hiccup or a re-skip never blocks the stamp, and
	 * the 3-layer guidance (Dashboard step · Staff empty-state · Services banner) remains the
	 * fallback whenever no staff exists afterwards.
	 */
	public function skip(): void {
		$this->autoCreateOwnerStaff();
		$this->funnel->stamp( 'skipped' );
	}

	/**
	 * Create the owner-staff for the skip path — ONLY when no staff exists at all and the current
	 * user has a usable identity (review F item 2):
	 *
	 *   - `staffCount > 0` → do nothing (never update/overwrite an existing row; also what makes a
	 *     double-skip idempotent: the second pass sees the first pass's row).
	 *   - current user without a valid email (or no user) → do nothing; guidance covers the gap.
	 *   - otherwise create through the SAME race-safe entry point the guided step uses
	 *     ({@see StaffGateway::createFirst()}), which fires
	 *     `aponto_staff_created` exactly like the guided path — so ServiceStaffAutolink works.
	 *     `existing` means a concurrent racer created staff #1 first: adopt it silently, never
	 *     update it. `locked`/`failed` are swallowed — the skip itself must still succeed.
	 */
	private function autoCreateOwnerStaff(): void {
		if ( $this->staffGateway()->count() > 0 ) {
			return;
		}

		$prefill = $this->currentUserPrefill();
		$name    = sanitize_text_field( (string) $prefill['name'] );
		$email   = sanitize_email( (string) $prefill['email'] );
		if ( '' === $name || '' === $email || false === is_email( $email ) ) {
			return;
		}

		$outcome = $this->staffGateway()->createFirst(
			array(
				'type'     => 'human',
				'name'     => $name,
				'email'    => $email,
				'status'   => 'active',
				'position' => 1,
			)
		);

		// Same owner-alerts mirror as the guided step (fleet-r1 Fix 2; U1 BUG-3): only on a REAL
		// create and only while `business.email` is still empty — never overwrite a configured one.
		if ( 'created' === $outcome['status']
			&& '' === trim( (string) $this->settings->get( 'business.email' ) ) ) {
			$this->settings->update( 'business.email', $email );
		}
	}

	/**
	 * Convert a major-unit price to the store currency's minor units (exponent from the central
	 * ISO-4217 table — {@see Settings::currencyExponent()}).
	 *
	 * @param float $major Price in the currency's major unit.
	 */
	private function priceToMinor( float $major ): int {
		$factor = Settings::currencyMinorFactor( (string) $this->settings->get( 'currency' ) );

		return (int) max( 0, (int) round( $major * $factor ) );
	}

	/**
	 * Re-scale every stored service price by the ISO-4217 exponent delta between two currencies,
	 * preserving the major-unit numeral the admin typed (see the saveBusiness guard comment):
	 * exponent 2→0 divides by 100 ($25.00 → ₫25), 0→2 multiplies by 100, 2→3 multiplies by 10.
	 * Equal exponents (USD→EUR) change nothing. Round-trips exactly for whole factors.
	 *
	 * @param string $old_currency Previous ISO code.
	 * @param string $new_currency New ISO code.
	 */
	private function rescaleServicePrices( string $old_currency, string $new_currency ): void {
		$shift = Settings::currencyExponent( $new_currency ) - Settings::currencyExponent( $old_currency );
		if ( 0 === $shift ) {
			return;
		}

		$table  = $this->wpdb->prefix . 'aponto_services';
		$factor = 10 ** abs( $shift );
		$sql    = $shift > 0
			? "UPDATE {$table} SET price_minor = price_minor * %d WHERE price_minor IS NOT NULL AND price_minor > 0"
			: "UPDATE {$table} SET price_minor = ROUND(price_minor / %d) WHERE price_minor IS NOT NULL AND price_minor > 0";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; factor bound via prepare(); one-shot wizard re-scale.
		$this->wpdb->query( $this->wpdb->prepare( $sql, $factor ) );
	}

	/**
	 * Connect a staff member to a service at the "no location" scope (idempotent).
	 *
	 * @param int $staff_id   Staff id.
	 * @param int $service_id Service id.
	 */
	private function connect( int $staff_id, int $service_id ): void {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "INSERT IGNORE INTO {$table} (staff_id, service_id, location_id) VALUES (%d, %d, 0)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); INSERT IGNORE is idempotent on the PK.
		$this->wpdb->query( $this->wpdb->prepare( $sql, $staff_id, $service_id ) );
	}

	/**
	 * All staff ids ascending.
	 *
	 * @return list<int>
	 */
	private function allStaffIds(): array {
		$table = $this->wpdb->prefix . 'aponto_staff';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		$ids = $this->wpdb->get_col( "SELECT id FROM {$table} ORDER BY id ASC" );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/**
	 * The first (lowest-id) staff id, or 0 when none.
	 */
	private function firstStaffId(): int {
		return $this->staffGateway()->lowestId();
	}

	/**
	 * Service row count.
	 */
	private function serviceCount(): int {
		$table = $this->wpdb->prefix . 'aponto_services';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		return (int) $this->wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	}

	/**
	 * The current user's display-name + email prefill for staff #1.
	 *
	 * @return array{name:string, email:string}
	 */
	private function currentUserPrefill(): array {
		$user = wp_get_current_user();
		if ( ! $user instanceof \WP_User || 0 === (int) $user->ID ) {
			return array(
				'name'  => '',
				'email' => '',
			);
		}

		$name = '' !== (string) $user->display_name ? (string) $user->display_name : (string) $user->user_login;

		return array(
			'name'  => $name,
			'email' => (string) $user->user_email,
		);
	}

	/**
	 * Serialize a page post into the wizard's page DTO.
	 *
	 * Every URL is computed from the CANONICAL permalink at render/response time (never cached in
	 * client state) and then made SAME-ORIGIN RELATIVE — the same convention {@see WizardPage} uses
	 * for `ajaxUrl`/`adminUrl`. An absolute `get_permalink()` is bound to `home_url()`, so an admin
	 * browsing on any other host (127.0.0.1 vs localhost, a local dev host such as `*.wp.local`
	 * fronted by a different address, a tunnel) got a link to a host their browser cannot reach:
	 * "Open booking page" errored out instead of opening the page (beta report 2026-07-26).
	 * Relative links follow whatever host the admin is actually on.
	 *
	 * @param \WP_Post $post    Page post.
	 * @param bool     $created Whether it was just created.
	 * @return array<string, mixed>
	 */
	private function pageInfo( \WP_Post $post, bool $created ): array {
		return array(
			'pageId'  => (int) $post->ID,
			'title'   => (string) $post->post_title,
			'status'  => (string) $post->post_status,
			'editUrl' => $this->sameOriginUrl( (string) get_edit_post_link( $post->ID, 'raw' ) ),
			'viewUrl' => $this->sameOriginUrl( (string) get_permalink( $post->ID ) ),
			'preview' => $this->sameOriginUrl( (string) get_preview_post_link( $post ) ),
			'created' => $created,
		);
	}

	/**
	 * Strip the scheme+host off an absolute site URL so the browser resolves it against the host the
	 * admin is currently on. An empty input (e.g. `get_edit_post_link()` returning null for a user
	 * who cannot edit the page) stays empty so the client can degrade visibly instead of rendering a
	 * dead link.
	 *
	 * @param string $url Absolute or already-relative URL.
	 */
	private function sameOriginUrl( string $url ): string {
		if ( '' === $url ) {
			return '';
		}

		return (string) wp_make_link_relative( $url );
	}

	/**
	 * Staff admin gateway.
	 */
	private function staffGateway(): StaffGateway {
		return new StaffGateway( $this->wpdb, $this->clock );
	}

	/**
	 * Service admin gateway.
	 */
	private function serviceGateway(): ServiceGateway {
		return new ServiceGateway( $this->wpdb, $this->clock );
	}

	/**
	 * Schedule admin gateway.
	 */
	private function scheduleGateway(): ScheduleGateway {
		return new ScheduleGateway( $this->wpdb );
	}
}

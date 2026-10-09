<?php
/**
 * Core settings registry.
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

use Aponto\Plan;

/**
 * Core settings live in a single option `aponto_settings` keyed by dotted paths (§4.3). Each
 * schema entry carries `{type, default, validator, capability, tab, panel}` so the admin renders
 * tabs from the schema (SPEC-P1 §1.6). Module config lives in its own `aponto_module_{code}`
 * option (autoload off); enabled flags live in `aponto_modules_enabled`.
 *
 * The pure validators ({@see self::validateCurrency()} etc.) contain no WordPress calls so they
 * are unit-testable; text validators delegate to WordPress sanitizers.
 *
 * @phpstan-type SettingSchema array{
 *     type: string,
 *     default: mixed,
 *     validator: callable,
 *     strict_validator?: callable(mixed):bool,
 *     capability: string,
 *     tab: string,
 *     panel: string,
 *     rest?: bool
 * }
 */
final class Settings {

	/**
	 * Option key for core settings.
	 */
	public const OPTION = 'aponto_settings';

	/**
	 * Reserved key inside the option array holding the write revision (rest-contract §2.11
	 * addendum 2026-07-19 C1). Not a schema key, so it never appears in {@see self::get()},
	 * {@see self::schema()} or {@see self::uiSchema()} — it rides the same option row so a
	 * value write and its revision bump are one atomic `update_option`.
	 */
	public const REVISION_KEY = '_revision';

	/**
	 * Capability gating every core setting in V1 (§6.3).
	 */
	private const CAP = 'aponto_manage_settings';

	/**
	 * Maximum length of the operator's own word for a staff member (`booking.staff_label`,
	 * D-R52). It is a NOUN; anything longer is a sentence typed into the wrong field.
	 */
	public const MAX_STAFF_LABEL = 40;

	/**
	 * Build the core settings schema, resolving WordPress-derived defaults, then let modules
	 * extend it via `aponto_settings_schema`.
	 *
	 * @return array<string, SettingSchema>
	 */
	public function schema(): array {
		$schema = $this->coreSchema();

		/**
		 * Filter the settings schema (extension-surface §2).
		 *
		 * @param array<string, SettingSchema> $schema Core settings schema.
		 */
		$schema = apply_filters( 'aponto_settings_schema', $schema );

		return is_array( $schema ) ? $schema : $this->coreSchema();
	}

	/**
	 * The presentation metadata the admin Settings UI groups by (SPEC-P1 §1.6): each schema key with
	 * its value `type` and its `tab`/`panel`. Values themselves are NOT included — the app reads those
	 * from `GET /settings` so it always round-trips the authoritative payload. Injected as boot data
	 * because the REST DTO contract (§2.11) is values-only and cannot carry metadata.
	 *
	 * @return list<array{key:string, type:string, tab:string, panel:string}>
	 */
	public function uiSchema(): array {
		$out = array();
		foreach ( $this->schema() as $key => $entry ) {
			if ( ! self::restExposed( $entry ) ) {
				continue; // REST-hidden keys render through their own feature surface (item 4).
			}
			$out[] = array(
				'key'   => $key,
				'type'  => (string) $entry['type'],
				'tab'   => (string) $entry['tab'],
				'panel' => (string) $entry['panel'],
			);
		}

		return $out;
	}

	/**
	 * Current value for a setting key (stored value or resolved default).
	 *
	 * @param string $key Dotted setting key.
	 * @return mixed Null when the key is unknown.
	 */
	public function get( string $key ): mixed {
		$schema = $this->schema();
		if ( ! isset( $schema[ $key ] ) ) {
			return null;
		}

		$stored = get_option( self::OPTION, array() );
		if ( is_array( $stored ) && array_key_exists( $key, $stored ) ) {
			$validator = $schema[ $key ]['validator'];

			return is_callable( $validator ) ? $validator( $stored[ $key ] ) : $stored[ $key ];
		}

		return $schema[ $key ]['default'];
	}

	/**
	 * The current settings write revision (0 before any write). Every {@see self::update()} —
	 * REST PUT, wizard, internal writers like the debug-log auto-off — increments it, so an
	 * admin form holding a stale snapshot can be detected at the REST write boundary
	 * (409 `aponto_settings_conflict`; rest-contract §2.11 addendum 2026-07-19 C1).
	 */
	public function revision(): int {
		$stored = get_option( self::OPTION, array() );
		if ( is_array( $stored ) && isset( $stored[ self::REVISION_KEY ] ) ) {
			return (int) $stored[ self::REVISION_KEY ];
		}

		return 0;
	}

	/**
	 * Validate and persist a single setting; returns the sanitized value.
	 *
	 * Every persisted write also bumps {@see self::REVISION_KEY} in the same `update_option`
	 * call, so any writer (REST, wizard, cron) invalidates concurrently-open settings forms.
	 *
	 * @param string $key   Dotted setting key.
	 * @param mixed  $value  Raw value.
	 * @param bool   $strict Reject values that would only be accepted through read-side coercion.
	 * @return mixed Sanitized value.
	 * @throws \InvalidArgumentException When the key or strict value is invalid.
	 */
	public function update( string $key, mixed $value, bool $strict = false ): mixed {
		$clean = $this->validate( $key, $value, $strict );

		$stored = get_option( self::OPTION, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		$was_enabled                  = 'debug_log' === $key && ! empty( $stored[ $key ] );
		$stored[ $key ]               = $clean;
		$stored[ self::REVISION_KEY ] = ( isset( $stored[ self::REVISION_KEY ] ) ? (int) $stored[ self::REVISION_KEY ] : 0 ) + 1;
		update_option( self::OPTION, $stored, true );
		if ( 'debug_log' === $key && (bool) $clean && ! $was_enabled ) {
			Logger::markEnabled( new Clock() );
		}

		return $clean;
	}

	/**
	 * Validate one value without persisting it.
	 *
	 * Strict mode is the REST write-boundary contract: values outside the declared type/range/enum
	 * are rejected. Non-strict mode retains §4.3 coercion for trusted internal writes and legacy
	 * values; read callers continue to receive schema defaults when no value is stored.
	 *
	 * @param string $key    Dotted setting key.
	 * @param mixed  $value  Raw value.
	 * @param bool   $strict Whether to reject instead of coerce invalid input.
	 * @return mixed Sanitized value.
	 * @throws \InvalidArgumentException When the key or strict value is invalid.
	 */
	public function validate( string $key, mixed $value, bool $strict = false ): mixed {
		$schema = $this->schema();
		if ( ! isset( $schema[ $key ] ) ) {
			throw new \InvalidArgumentException( esc_html( sprintf( 'Aponto\\Support\\Settings: unknown setting "%s".', $key ) ) );
		}
		if ( $strict ) {
			$strict_validator = $schema[ $key ]['strict_validator'] ?? null;
			$valid            = is_callable( $strict_validator )
				? (bool) $strict_validator( $value )
				: self::strictTypeAccepts( (string) $schema[ $key ]['type'], $value );
			if ( ! $valid ) {
				throw new \InvalidArgumentException( esc_html( sprintf( 'Aponto\\Support\\Settings: invalid value for "%s".', $key ) ) );
			}
		}

		$validator = $schema[ $key ]['validator'];

		return is_callable( $validator ) ? $validator( $value ) : $value;
	}

	/**
	 * Read a module's config option (autoload off).
	 *
	 * @param string $code Module code.
	 * @return array<string, mixed>
	 */
	public function moduleOption( string $code ): array {
		$value = get_option( 'aponto_module_' . $code, array() );

		return is_array( $value ) ? $value : array();
	}

	/**
	 * Write a module's config option (autoload off).
	 *
	 * @param string               $code  Module code.
	 * @param array<string, mixed> $value Config payload.
	 */
	public function updateModuleOption( string $code, array $value ): bool {
		return update_option( 'aponto_module_' . $code, $value, false );
	}

	/**
	 * The module enabled-flags catalog (missing key = enabled).
	 *
	 * @return array<string, bool>
	 */
	public function modulesEnabled(): array {
		$flags = get_option( Plan::MODULES_ENABLED_OPTION, array() );

		return is_array( $flags ) ? $flags : array();
	}

	/**
	 * Toggle a module's enabled flag.
	 *
	 * @param string $code    Module code.
	 * @param bool   $enabled Enabled flag.
	 */
	public function setModuleEnabled( string $code, bool $enabled ): void {
		$flags          = $this->modulesEnabled();
		$flags[ $code ] = $enabled;
		update_option( Plan::MODULES_ENABLED_OPTION, $flags, true );
	}

	/**
	 * Core settings schema with resolved defaults.
	 *
	 * @return array<string, SettingSchema>
	 */
	private function coreSchema(): array {
		$text     = array( self::class, 'validateText' );
		$textarea = array( self::class, 'validateTextarea' );
		$bool     = array( self::class, 'validateBool' );
		$int      = array( self::class, 'validateNonNegativeInt' );
		$string   = static fn ( mixed $value ): bool => is_string( $value );
		$boolean  = static fn ( mixed $value ): bool => is_bool( $value );
		$nonneg   = static fn ( mixed $value ): bool => is_int( $value ) && $value >= 0;
		$positive = static fn ( mixed $value ): bool => is_int( $value ) && $value >= 1;

		return array(
			'business.name'                        => $this->entry( 'string', $this->siteName(), $text, 'general', 'business', $string ),
			'business.address'                     => $this->entry( 'string', '', $textarea, 'general', 'business', $string ),
			'business.phone'                       => $this->entry( 'string', '', $text, 'general', 'business', $string ),
			// Where owner "new booking" alerts are sent. Empty falls back to the WordPress admin
			// email at send time ({@see \Aponto\Notification\NotificationDispatcher::adminEmail()});
			// the wizard prefills it with the staff email the owner types in step 4 (fleet-r1 Fix 2,
			// finding U1 BUG-3 — alerts must reach the address the owner set, not a leftover WP admin
			// email a different person installed with).
			'business.email'                       => $this->entry( 'string', '', array( self::class, 'validateEmailSetting' ), 'general', 'business', array( self::class, 'isEmailSetting' ) ),
			'currency'                             => $this->entry( 'string', self::defaultCurrency(), array( self::class, 'validateCurrency' ), 'general', 'localization', array( self::class, 'isCurrency' ) ),
			'date_format'                          => $this->entry( 'string', (string) get_option( 'date_format', 'F j, Y' ), $text, 'general', 'localization', $string ),
			'time_format'                          => $this->entry( 'string', (string) get_option( 'time_format', 'g:i a' ), $text, 'general', 'localization', $string ),
			'week_starts_on'                       => $this->entry( 'int', (int) get_option( 'start_of_week', 1 ), array( self::class, 'validateWeekStart' ), 'general', 'localization', array( self::class, 'isWeekStart' ) ),
			'default_booking_status'               => $this->entry( 'string', 'pending', array( self::class, 'validateBookingStatus' ), 'booking', 'policy', array( self::class, 'isBookingStatus' ) ),
			'min_lead_minutes'                     => $this->entry( 'int', 60, $int, 'booking', 'policy', $nonneg ),
			'max_horizon_days'                     => $this->entry( 'int', 365, $int, 'booking', 'policy', $positive ),
			'slot_step_default'                    => $this->entry( 'int', 30, $int, 'booking', 'policy', $positive ),
			'min_cancel_hours'                     => $this->entry( 'int', 0, $int, 'booking', 'policy', $nonneg ),
			'pending_auto_cancel_hours'            => $this->entry( 'int', 0, $int, 'booking', 'policy', $nonneg ),
			// A $0 service has nothing to collect or approve, so a pending default just adds a
			// needless manual step (finding U3 Jonas). When ON (default), a free-priced service is
			// booked straight to `confirmed`, bypassing `default_booking_status` — B2 / SPEC-P1
			// §2.2 addendum 2026-07-20. The reserve path reads this at the status decision
			// ({@see \Aponto\Booking\ReservationService::defaultCreateStatus()}).
			'booking.auto_confirm_free'            => $this->entry( 'bool', true, $bool, 'booking', 'policy', $boolean ),

			/*
			 * Which clock the booking form shows by default (D-R48, founder 2026-09-18 — the
			 * "quiet timezone" model C3). `visitor` is the default and is exactly what every site
			 * did before this key existed: times render in the visitor's own browser zone.
			 * `business` renders them in the business zone and says so — but ONLY to a visitor who
			 * is somewhere else, because telling a local customer their own clock is their own
			 * clock is noise.
			 *
			 * PRESENTATION ONLY, never a correctness gate (AGENTS §1 "never gate timezone
			 * correctness"): the form's timezone picker exists in both modes, so a remote customer
			 * can always move the whole flow onto their own zone, `tz` stays a required argument of
			 * `/public/availability` and `POST /public/bookings`, and `customer_timezone` still
			 * persists whatever zone the booking was actually made in.
			 */
			'booking.timezone_mode'                => $this->entry( 'string', 'visitor', array( self::class, 'validateTimezoneMode' ), 'booking', 'policy', array( self::class, 'isTimezoneMode' ) ),

			/*
			 * Whether the booking form lets the customer pick a staff member (D-R50, founder
			 * 2026-09-20). `visitor` — the default — offers the choice on a dedicated step
			 * between Service and Date & time, with "Any available" preselected; `any` never
			 * asks and leaves every booking to the first-free `(position, id)` assignment.
			 *
			 * **D-R52 (founder 2026-09-20, phase 2) adds a THIRD value, `required`**: the customer
			 * must name a staff member, so the "Any available" row is not rendered at all and
			 * `POST /public/bookings` REFUSES a null `staff_id` for a service that really has a
			 * choice in it (≥2 PUBLIC eligible staff). It is the same question as `visitor`, with
			 * the escape hatch removed — which is why it publishes the same roster.
			 *
			 * It only MEANS anything with the `multi_staff` module available, which is why the
			 * control is hidden without it; the gate itself is server-side, in
			 * {@see \Aponto\Rest\Controller\PublicServicesController}, and the key round-trips
			 * untouched either way so a downgrade loses no configuration.
			 */
			'booking.staff_choice'                 => $this->entry( 'string', 'visitor', array( self::class, 'validateStaffChoice' ), 'booking', 'staff', array( self::class, 'isStaffChoice' ) ),

			/*
			 * How the Staff step PRESENTS the roster, and how much of a staff public profile it
			 * publishes (D-R52, founder 2026-09-20 — phase 2 of the staff public profile;
			 * mockup `docs/mockups/v4/booking-form/specialist-step.html`). Five keys, all under
			 * the `staff` panel beside `booking.staff_choice`, all display-only gated on
			 * `multi_staff` in the admin and all ENFORCED server-side here and in
			 * {@see \Aponto\Rest\Controller\PublicServicesController}.
			 *
			 *  - `staff_layout` — `list` (default) or `cards`. Presentation only, and the ONE key
			 *    a single block may override (`staffLayout` data-prop), because a landing page
			 *    legitimately wants a different shape from the site default.
			 *  - `staff_photos` — default ON. Turning it OFF does not merely hide the circle: the
			 *    public roster then OMITS `avatar` entirely, so no gravatar.com URL (which carries
			 *    core's hash of the staff email) is published at all. That is the operator's THIRD
			 *    way out of the D-R51 Gravatar disclosure, beside uploading a photo and switching
			 *    Settings → Discussion avatars off — and the only one that lives in this plugin.
			 *  - `staff_titles` — default ON. Off omits `title` from the PRE-booking roster; the
			 *    post-booking staff object is unchanged, because a customer who has just booked
			 *    somebody is owed the answer to "who am I seeing?".
			 *  - `staff_profiles` — default **OFF** (founder: exposing staff details is a
			 *    per-business opt-in). Only with it ON does the roster publish `bio`, and then
			 *    only for staff whose bio is non-empty. With it off the reader does not even
			 *    SELECT the column, so the text cannot leak by accident (the D-R51 property, kept).
			 */
			'booking.staff_layout'                 => $this->entry( 'string', 'list', array( self::class, 'validateStaffLayout' ), 'booking', 'staff', array( self::class, 'isStaffLayout' ) ),
			'booking.staff_photos'                 => $this->entry( 'bool', true, $bool, 'booking', 'staff', $boolean ),
			'booking.staff_titles'                 => $this->entry( 'bool', true, $bool, 'booking', 'staff', $boolean ),
			'booking.staff_profiles'               => $this->entry( 'bool', false, $bool, 'booking', 'staff', $boolean ),

			/*
			 * What THIS business calls its staff on the booking form (D-R52, founder
			 * 2026-09-20). Aponto serves salons, clinics, gyms and tutors, so no noun may be
			 * hard-coded in the product: the form ships a neutral translated default ("staff
			 * member") and this key replaces it with the operator's own word — "stylist",
			 * "doctor", "trainer", "instructor".
			 *
			 * `''` means "use the translated default", NOT an empty word, which is why the read
			 * validator can return the empty string and the widget resolves it. Singular and
			 * lower case, because every form string is a template written without an article
			 * ("Choose your %s") so it reads correctly for any noun and translates cleanly.
			 * 40 characters is a hard cap in both directions: it is a NOUN, and anything longer
			 * is a sentence somebody typed into the wrong field.
			 *
			 * Plain text, rendered as a TEXT NODE in the widget's shadow root — the same rule
			 * `bio` follows (D-R51), for the same reason.
			 */
			'booking.staff_label'                  => $this->entry( 'string', '', array( self::class, 'validateStaffLabel' ), 'booking', 'staff', array( self::class, 'isStaffLabel' ) ),

			/*
			 * Whether the booking form asks the customer WHERE (D-R60/D-R61, rest-contract §2.11
			 * addendum 2026-09-23). `visitor` — the default — offers a Location step (D-R56 order
			 * Service → Location → Staff → Date & time) once the site has two or more active
			 * locations serving a service; `first` never asks and books every request at the
			 * first active serving location by `name ASC, id ASC` — and ONLY there (fix round 2,
			 * option A: an explicit other branch gets zero slots and a `422`), the shape of a site
			 * whose other branches are listed but not bookable online yet. "Name order" is the
			 * database's `ORDER BY name`, so MySQL's case/accent-insensitive collations and
			 * SQLite's binary one may pick differently between names that differ only that way.
			 *
			 * There is deliberately no "any location" value: assigning a place the customer did
			 * not pick is a surprise, not a convenience (D-R60 rule 3). One active location is a
			 * fact rather than a choice and is assigned silently under either value.
			 *
			 * Only MEANINGFUL with `multi_location` available, which is why the control is hidden
			 * without it; the gate itself is server-side, in
			 * {@see \Aponto\Rest\Support\LocationResolution}, and the key round-trips untouched
			 * either way so a downgrade loses no configuration. Its own `location` panel, rendered
			 * by the Booking → Policy section exactly like `staff` (D-R52).
			 */
			'booking.location_choice'              => $this->entry( 'string', 'visitor', array( self::class, 'validateLocationChoice' ), 'booking', 'location', array( self::class, 'isLocationChoice' ) ),

			/*
			 * Payments (D-R38). `mode` is the master switch: `off` hides the payment step and makes
			 * `POST /public/bookings` reject any method, `optional` offers online payment beside
			 * pay-on-site, `required` demands it for a priced service. `hold_minutes` bounds how long
			 * an unpaid reservation keeps a slot — the floor of 10 exists because a customer needs
			 * time to find a card, and the ceiling of 1440 because a slot held for more than a day is
			 * indistinguishable from a booking nobody will pay for. `auto_confirm` decides whether a
			 * paid booking confirms itself (founder Q5); turning it off keeps a manual approval step
			 * for studios that screen their appointments.
			 */
			'payments.mode'                        => $this->entry( 'string', 'optional', array( self::class, 'validatePaymentMode' ), 'booking', 'payments', array( self::class, 'isPaymentMode' ) ),
			// D-R79 (opt-in, default `accept` = D-R38a(1) unchanged): what the public form does with a
			// PAID service while online payment is required and no payment method is ready —
			// `accept` takes the booking without payment, `refuse` does not take it.
			'payments.when_unavailable'            => $this->entry( 'string', 'accept', array( self::class, 'validateWhenUnavailable' ), 'booking', 'payments', array( self::class, 'isWhenUnavailable' ) ),
			'payments.hold_minutes'                => $this->entry( 'int', 30, array( self::class, 'validateHoldMinutes' ), 'booking', 'payments', array( self::class, 'isHoldMinutes' ) ),
			'payments.auto_confirm'                => $this->entry( 'bool', true, $bool, 'booking', 'payments', $boolean ),
			// Booking-form data collection + consent live under the Privacy tab (SPEC-P1 §1.6:
			// "consent checkbox config"). The phone-field mode is the booking form's PII-collection
			// switch, so it groups with consent as data collection.
			'customer_fields.phone'                => $this->entry( 'string', 'optional', array( self::class, 'validatePhoneMode' ), 'privacy', 'collection', array( self::class, 'isPhoneMode' ) ),
			'consent_checkbox.enabled'             => $this->entry( 'bool', false, $bool, 'privacy', 'consent', $boolean ),
			'consent_checkbox.text'                => $this->entry( 'string', '', $textarea, 'privacy', 'consent', $string ),
			// Appearance keys keep their `appearance` tab as a persistence bucket, but the Settings UI
			// renders NO Appearance tab (Q11 2026-07-18: form appearance moved to the block inspector,
			// §2.1). The values still round-trip through PUT /settings so nothing is lost.
			'appearance.accent'                    => $this->entry( 'string', '#2563eb', array( self::class, 'validateHexColor' ), 'appearance', 'theme', array( self::class, 'isHexColor' ) ),
			'appearance.radius'                    => $this->entry( 'int', 8, $int, 'appearance', 'theme', $nonneg ),
			'appearance.custom_css'                => $this->entry( 'string', '', array( self::class, 'validateCss' ), 'appearance', 'theme', $string ),
			// Flood caps keep the `notifications` tab bucket; the Notifications tab renders the template
			// editor component (§3), not a schema panel, so these are edited via REST/round-trip only.

			/*
			 * `flood_per_booking` counts EVERY delivery row for one booking, across recipients — it
			 * is an abuse ceiling, not a per-audience budget. It was raised 5 → 10 with D-R28 (Codex
			 * review) because premium adds a THIRD recipient to each lifecycle event, and at 5 an
			 * entirely ordinary booking ran out of budget mid-life:
			 *
			 *   created   → customer + admin + staff = 3
			 *   confirmed → customer                 = 4
			 *   cancelled → customer                 = 5  ← cap reached
			 *                admin + staff           = SUPPRESSED
			 *
			 * i.e. the staff member silently stopped being told their booking was cancelled — the
			 * one event they most need, and visible only as a `notification_suppressed_flood` row.
			 * A reschedule (+1, and +1 again if it is later cancelled) stacks further. 10 leaves
			 * headroom for a rescheduled-then-cancelled premium booking while still bounding a
			 * runaway loop; the per-customer/day cap is the one that actually protects a customer's
			 * inbox and is unchanged (D-R19: it applies to `customer` recipients only, so raising
			 * this does not widen it).
			 */
			'notifications.flood_per_booking'      => $this->entry( 'int', 10, $int, 'notifications', 'limits', $positive ),
			'notifications.flood_per_customer_day' => $this->entry( 'int', 20, $int, 'notifications', 'limits', $positive ),
			// Sender identity for Aponto's own emails (A2 — U4). Empty = the WordPress default From
			// name/address. from_email/reply_to accept a valid address or '' (clear); the values feed
			// {@see \Aponto\Notification\SyncSender}, which scopes the wp_mail From filters to Aponto
			// sends only so other plugins' mail is untouched. SCOPED OUT of the core /settings REST
			// surface (`rest => false` — Codex review E item 4): GET /settings never exposes them and
			// the full-replacement PUT /settings can neither write NOR reset them, so a scripted PUT
			// that omits the group cannot clobber the sender. Their ONLY REST surface is the
			// GET/PUT /notifications sender object (rest-contract §2.13 addendum).
			'notifications.from_name'              => $this->restHidden( $this->entry( 'string', '', $text, 'notifications', 'sender', $string ) ),
			'notifications.from_email'             => $this->restHidden( $this->entry( 'string', '', array( self::class, 'validateEmailSetting' ), 'notifications', 'sender', array( self::class, 'isEmailSetting' ) ) ),
			'notifications.reply_to'               => $this->restHidden( $this->entry( 'string', '', array( self::class, 'validateEmailSetting' ), 'notifications', 'sender', array( self::class, 'isEmailSetting' ) ) ),
			'data_retention_months'                => $this->entry( 'int', 0, $int, 'privacy', 'retention', $nonneg ),
			'debug_log'                            => $this->entry( 'bool', false, $bool, 'advanced', 'diagnostics', $boolean ),
			'trusted_proxy'                        => $this->entry( 'bool', false, $bool, 'advanced', 'diagnostics', $boolean ),
			'delete_data_on_uninstall'             => $this->entry( 'bool', false, $bool, 'advanced', 'data', $boolean ),
		);
	}

	/**
	 * Assemble one schema entry.
	 *
	 * @param string   $type          Value type hint.
	 * @param mixed    $default_value Resolved default.
	 * @param callable $validator     Validator/sanitizer.
	 * @param string   $tab           Admin tab slug.
	 * @param string   $panel         Admin panel slug.
	 * @param callable $strict        Optional strict write validator.
	 * @return SettingSchema
	 */
	private function entry( string $type, mixed $default_value, callable $validator, string $tab, string $panel, ?callable $strict = null ): array {
		$entry = array(
			'type'       => $type,
			'default'    => $default_value,
			'validator'  => $validator,
			'capability' => self::CAP,
			'tab'        => $tab,
			'panel'      => $panel,
		);
		if ( null !== $strict ) {
			$entry['strict_validator'] = $strict;
		}

		return $entry;
	}

	/**
	 * Mark a schema entry as hidden from the core /settings REST surface (Codex review E item 4):
	 * the key still lives in the registry (get/update/validate, uninstall cleanup) but
	 * {@see \Aponto\Rest\Controller\SettingsController} neither reads nor writes nor resets it —
	 * its owning feature surface (e.g. GET/PUT /notifications) is the only REST path.
	 *
	 * @param SettingSchema $entry Schema entry.
	 * @return SettingSchema
	 */
	private function restHidden( array $entry ): array {
		$entry['rest'] = false;

		return $entry;
	}

	/**
	 * Whether a schema entry belongs to the core /settings REST surface (default true; entries
	 * marked by {@see self::restHidden()} are excluded from GET/PUT /settings entirely).
	 *
	 * @param SettingSchema $entry Schema entry.
	 */
	public static function restExposed( array $entry ): bool {
		return false !== ( $entry['rest'] ?? true );
	}

	/**
	 * Site title default for `business.name`.
	 */
	private function siteName(): string {
		return self::blogName();
	}

	/**
	 * The site title as raw human text. `get_bloginfo( 'name' )` returns the stored blogname, which
	 * WordPress HTML-encodes when it is saved (`esc_html` inside `sanitize_option`), so an
	 * ampersand comes back as `&amp;`. Decode it once here: this value feeds the `business.name`
	 * default, the wizard's prefilled input and the `{site_name}` email placeholder, and every one
	 * of those re-escapes at render (`esc_html`, React value binding) — encoding it here would
	 * double-encode into `&amp;amp;` (fleet-r1 Fix 3; finding U1 BUG-1).
	 */
	public static function blogName(): string {
		return wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES );
	}

	/**
	 * Default currency from the WordPress locale, always a valid 3-letter code (§4.3).
	 */
	public static function defaultCurrency(): string {
		$locale = function_exists( 'get_locale' ) ? get_locale() : 'en_US';

		return self::currencyForLocale( $locale );
	}

	/**
	 * A neutral, global list of ISO-4217 currency codes for the onboarding currency picker
	 * (Aponto targets a worldwide audience — no regional bias). Covers every code the locale map
	 * ({@see self::currencyForLocale()}) can prefill plus the zero-decimal currencies and other
	 * common majors, sorted alphabetically. The store still accepts any valid 3-letter code
	 * ({@see self::validateCurrency()}); this list is only the convenience menu.
	 *
	 * @return list<string>
	 */
	public static function currencyChoices(): array {
		return explode(
			' ',
			'AED ARS AUD BDT BGN BHD BIF BRL CAD CHF CLP CNY COP CZK DJF DKK EGP EUR GBP GHS '
			. 'GNF HKD HUF IDR ILS INR ISK JOD JPY KES KMF KRW KWD LKR MXN MYR NGN NOK NZD OMR '
			. 'PHP PKR PLN PYG RON RUB RWF SAR SEK SGD THB TND TRY TWD UAH UGX USD VND VUV XAF '
			. 'XOF XPF ZAR'
		);
	}

	/**
	 * ISO-4217 minor-unit exponent for a currency — THE single source for every PHP price scale
	 * and format decision (Codex review item 5). Zero-decimal currencies store major units
	 * directly (VND 150000 = ₫150,000); three-decimal currencies (Gulf dinars/rial) store
	 * thousandths (KWD 25000 = KD 25.000); everything else uses the conventional two decimals.
	 * Accepts any 3-letter code ({@see self::validateCurrency()} never narrows to the menu), so
	 * unknown codes get the safe default of 2.
	 *
	 * **THE JS SIDE MUST NOT RE-DERIVE THIS** (corrected 2026-09-04, Codex A1). This docblock used
	 * to claim that `Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits` resolved
	 * identical exponents. It does not: `Intl` follows CLDR's DISPLAY conventions, which report 0
	 * for COP, HUF, IDR, PKR and MGA (2 here) and 0 for IQD (3 here) — a 100× or 1000× disagreement
	 * about the scale of a stored integer. The admin ships this value in its boot config
	 * (`AdminPage::bootConfig()` → `config.currencyExponent`) and `Intl` is used only for grouping
	 * and the currency symbol.
	 *
	 * @param string $currency ISO currency code (any case).
	 */
	public static function currencyExponent( string $currency ): int {
		$code = strtoupper( trim( $currency ) );

		$zero  = array( 'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF' );
		$three = array( 'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND' );

		if ( in_array( $code, $zero, true ) ) {
			return 0;
		}
		if ( in_array( $code, $three, true ) ) {
			return 3;
		}

		return 2;
	}

	/**
	 * Minor units per major unit for a currency (`10 ** exponent`): 1 for VND, 100 for USD,
	 * 1000 for KWD.
	 *
	 * @param string $currency ISO currency code (any case).
	 */
	public static function currencyMinorFactor( string $currency ): int {
		return 10 ** self::currencyExponent( $currency );
	}

	/**
	 * Map a WordPress locale to an ISO-4217 currency, falling back to USD.
	 *
	 * The map is intentionally modest (common locales); anything unmapped returns USD so the
	 * value is never empty.
	 *
	 * @param string $locale WordPress locale (e.g. `en_US`, `vi`).
	 */
	public static function currencyForLocale( string $locale ): string {
		$map = array(
			'en_US' => 'USD',
			'en_GB' => 'GBP',
			'en_CA' => 'CAD',
			'en_AU' => 'AUD',
			'en_NZ' => 'NZD',
			'en_ZA' => 'ZAR',
			'vi'    => 'VND',
			'ja'    => 'JPY',
			'ko_KR' => 'KRW',
			'zh_CN' => 'CNY',
			'zh_TW' => 'TWD',
			'zh_HK' => 'HKD',
			'th'    => 'THB',
			'id_ID' => 'IDR',
			'ms_MY' => 'MYR',
			'fil'   => 'PHP',
			'hi_IN' => 'INR',
			'ru_RU' => 'RUB',
			'tr_TR' => 'TRY',
			'pl_PL' => 'PLN',
			'sv_SE' => 'SEK',
			'nb_NO' => 'NOK',
			'da_DK' => 'DKK',
			'cs_CZ' => 'CZK',
			'ro_RO' => 'RON',
			'pt_BR' => 'BRL',
			'es_MX' => 'MXN',
			'es_AR' => 'ARS',
			'es_CO' => 'COP',
			'es_CL' => 'CLP',
			'de_DE' => 'EUR',
			'de_AT' => 'EUR',
			'fr_FR' => 'EUR',
			'es_ES' => 'EUR',
			'it_IT' => 'EUR',
			'nl_NL' => 'EUR',
			'pt_PT' => 'EUR',
			'el'    => 'EUR',
			'fi'    => 'EUR',
			'ga'    => 'EUR',
		);

		if ( isset( $map[ $locale ] ) ) {
			return $map[ $locale ];
		}

		// Fall back on the language prefix (e.g. `de_CH` -> `de` -> EUR is wrong, so only
		// prefix-map the safe ones), otherwise USD.
		$prefix       = strtok( $locale, '_' );
		$prefix_map   = array(
			'vi' => 'VND',
			'ja' => 'JPY',
			'th' => 'THB',
		);
		$prefix_value = false === $prefix ? '' : ( $prefix_map[ $prefix ] ?? '' );

		return '' !== $prefix_value ? $prefix_value : 'USD';
	}

	/**
	 * Whether a REST write contains a currency shape that can be normalized without fallback.
	 *
	 * @param mixed $value Raw value.
	 */
	private static function isCurrency( mixed $value ): bool {
		return is_string( $value ) && 1 === preg_match( '/^[A-Z]{3}$/', strtoupper( trim( $value ) ) );
	}

	/**
	 * Whether a REST write is a valid start-of-week index.
	 *
	 * @param mixed $value Raw value.
	 */
	private static function isWeekStart( mixed $value ): bool {
		return is_int( $value ) && $value >= 0 && $value <= 6;
	}

	/**
	 * Whether a REST write is a supported default booking status.
	 *
	 * @param mixed $value Raw value.
	 */
	private static function isBookingStatus( mixed $value ): bool {
		return in_array( $value, array( 'pending', 'confirmed' ), true );
	}

	/**
	 * Whether a REST write is a supported phone-field mode.
	 *
	 * @param mixed $value Raw value.
	 */
	private static function isPhoneMode( mixed $value ): bool {
		return in_array( $value, array( 'off', 'optional', 'required' ), true );
	}

	/**
	 * Whether a REST write is a valid hex colour instead of a value requiring fallback.
	 *
	 * @param mixed $value Raw value.
	 */
	private static function isHexColor( mixed $value ): bool {
		if ( ! is_string( $value ) ) {
			return false;
		}
		$color = sanitize_hex_color( $value );

		return is_string( $color ) && '' !== $color;
	}

	/**
	 * Strict fallback for extension schema entries that do not declare a range/enum predicate.
	 *
	 * @param string $type  Declared schema type.
	 * @param mixed  $value Raw value.
	 */
	private static function strictTypeAccepts( string $type, mixed $value ): bool {
		return match ( $type ) {
			'string' => is_string( $value ),
			'int'    => is_int( $value ),
			'bool'   => is_bool( $value ),
			default  => false,
		};
	}

	/**
	 * Validate a currency code: uppercase 3 letters, else USD (never empty — §4.3).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateCurrency( mixed $value ): string {
		$code = strtoupper( trim( (string) $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $code ) ? $code : 'USD';
	}

	/**
	 * Validate the default booking status enum.
	 *
	 * @param mixed $value Raw value.
	 * @return 'pending'|'confirmed'
	 */
	public static function validateBookingStatus( mixed $value ): string {
		return 'confirmed' === $value ? 'confirmed' : 'pending';
	}

	/**
	 * Validate the payment mode enum (D-R38).
	 *
	 * @param mixed $value Raw value.
	 * @return 'off'|'optional'|'required'
	 */
	public static function validatePaymentMode( mixed $value ): string {
		return in_array( $value, array( 'off', 'optional', 'required' ), true ) ? $value : 'optional';
	}

	/**
	 * Whether a value is a valid payment mode (strict write validator).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isPaymentMode( mixed $value ): bool {
		return is_string( $value ) && in_array( $value, array( 'off', 'optional', 'required' ), true );
	}

	/**
	 * Validate `payments.when_unavailable` (D-R79). Falls back to `accept` — the behaviour every
	 * site had before the setting existed — so an unreadable stored value can never start refusing
	 * a live site's bookings.
	 *
	 * @param mixed $value Raw value.
	 * @return 'accept'|'refuse'
	 */
	public static function validateWhenUnavailable( mixed $value ): string {
		return 'refuse' === $value ? 'refuse' : 'accept';
	}

	/**
	 * Whether a value is a valid `payments.when_unavailable` (strict write validator).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isWhenUnavailable( mixed $value ): bool {
		return is_string( $value ) && in_array( $value, array( 'accept', 'refuse' ), true );
	}

	/**
	 * The two booking-form timezone modes (D-R48).
	 *
	 * @return array<int, string>
	 */
	public static function timezoneModes(): array {
		return array( 'visitor', 'business' );
	}

	/**
	 * Validate the booking-form timezone mode enum (D-R48).
	 *
	 * Falls back to `visitor` — the pre-D-R48 behaviour — so an unreadable stored value can never
	 * silently move a live site's booking form onto a different clock.
	 *
	 * @param mixed $value Raw value.
	 * @return 'visitor'|'business'
	 */
	public static function validateTimezoneMode( mixed $value ): string {
		return in_array( $value, self::timezoneModes(), true ) ? $value : 'visitor';
	}

	/**
	 * Whether a value is a valid timezone mode (strict write validator).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isTimezoneMode( mixed $value ): bool {
		return is_string( $value ) && in_array( $value, self::timezoneModes(), true );
	}

	/**
	 * The booking-form staff-selection modes (D-R50; `required` added by D-R52).
	 *
	 * @return array<int, string>
	 */
	public static function staffChoiceModes(): array {
		return array( 'visitor', 'required', 'any' );
	}

	/**
	 * The two Staff-step layouts (D-R52).
	 *
	 * @return array<int, string>
	 */
	public static function staffLayouts(): array {
		return array( 'list', 'cards' );
	}

	/**
	 * Validate the Staff-step layout (D-R52).
	 *
	 * Falls back to `list`, the default, because Cards is the richer presentation and an
	 * unreadable stored value must never silently upgrade a site into a layout its owner never
	 * chose.
	 *
	 * @param mixed $value Raw value.
	 * @return 'list'|'cards'
	 */
	public static function validateStaffLayout( mixed $value ): string {
		return in_array( $value, self::staffLayouts(), true ) ? $value : 'list';
	}

	/**
	 * Whether a value is a valid Staff-step layout (strict write validator).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isStaffLayout( mixed $value ): bool {
		return is_string( $value ) && in_array( $value, self::staffLayouts(), true );
	}

	/**
	 * Validate the customer-facing staff term (D-R52).
	 *
	 * Read side: sanitize, trim, truncate. `''` is a legal and meaningful value — it means
	 * "use the product's own translated default" — so there is nothing to fall back TO and the
	 * conservative answer to an unreadable stored value is the default term, i.e. `''`.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateStaffLabel( mixed $value ): string {
		if ( ! is_string( $value ) ) {
			return '';
		}

		return mb_substr( trim( sanitize_text_field( $value ) ), 0, self::MAX_STAFF_LABEL );
	}

	/**
	 * Whether a value is a usable staff term (strict write validator).
	 *
	 * REFUSES an over-long term rather than truncating it, the same way the staff `title` and
	 * `bio` fields do (D-R51): a silently cut word is a word the operator never chose, and the
	 * admin control counts to the same number.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isStaffLabel( mixed $value ): bool {
		return is_string( $value ) && mb_strlen( trim( $value ) ) <= self::MAX_STAFF_LABEL;
	}

	/**
	 * Validate the staff-selection enum (D-R50).
	 *
	 * Falls back to `visitor`, the default, so an unreadable stored value shows the choice
	 * rather than silently taking it away — the conservative direction here is the one that
	 * keeps the customer in control of who they see.
	 *
	 * @param mixed $value Raw value.
	 * @return 'visitor'|'required'|'any'
	 */
	public static function validateStaffChoice( mixed $value ): string {
		return in_array( $value, self::staffChoiceModes(), true ) ? $value : 'visitor';
	}

	/**
	 * Whether a value is a valid staff-selection mode (strict write validator).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isStaffChoice( mixed $value ): bool {
		return is_string( $value ) && in_array( $value, self::staffChoiceModes(), true );
	}

	/**
	 * The booking-form location-selection modes (D-R61).
	 *
	 * @return array<int, string>
	 */
	public static function locationChoiceModes(): array {
		return array( 'visitor', 'first' );
	}

	/**
	 * Validate the location-selection enum (D-R61).
	 *
	 * Falls back to `visitor`, the default, for the same reason `booking.staff_choice` does: an
	 * unreadable stored value must leave the customer the choice rather than silently deciding
	 * where they go.
	 *
	 * @param mixed $value Raw value.
	 * @return 'visitor'|'first'
	 */
	public static function validateLocationChoice( mixed $value ): string {
		return in_array( $value, self::locationChoiceModes(), true ) ? $value : 'visitor';
	}

	/**
	 * Whether a value is a valid location-selection mode (strict write validator).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isLocationChoice( mixed $value ): bool {
		return is_string( $value ) && in_array( $value, self::locationChoiceModes(), true );
	}

	/**
	 * Clamp the hold length into 10…1440 minutes (D-R38).
	 *
	 * Clamped rather than rejected because this is the READ-side validator, and a stored value that
	 * drifted out of range (an older build, a direct database edit) must still produce a usable
	 * hold rather than a zero-length one. The strict WRITE validator below refuses instead, so REST
	 * never silently accepts a value it will not honour.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateHoldMinutes( mixed $value ): int {
		return min( 1440, max( 10, (int) $value ) );
	}

	/**
	 * Whether a value is an in-range hold length (strict write validator).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function isHoldMinutes( mixed $value ): bool {
		// TYPE ONLY — the RANGE is clamped, not rejected (D-R40d, QA run 2 observation). rest-contract
		// §"Addendum (D-R38)" documents `payments.hold_minutes` as "giá trị ngoài range bị clamp bởi
		// validator và giá trị sai kiểu bị 422 bởi strict validator", and the implementation answered
		// `422` for both. `5` is not a client error the caller can learn anything from — it is a
		// number outside a bound the server owns, and {@see self::validateHoldMinutes()} pulls it to
		// the nearest legal value. A non-integer still fails here, which is what the doc says.
		return is_int( $value );
	}

	/**
	 * Validate the customer phone-field mode enum.
	 *
	 * @param mixed $value Raw value.
	 * @return 'off'|'optional'|'required'
	 */
	public static function validatePhoneMode( mixed $value ): string {
		return in_array( $value, array( 'off', 'optional', 'required' ), true ) ? $value : 'optional';
	}

	/**
	 * Coerce to a non-negative integer.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateNonNegativeInt( mixed $value ): int {
		$int = (int) $value;

		return $int < 0 ? 0 : $int;
	}

	/**
	 * Coerce to a start-of-week day index (0-6).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateWeekStart( mixed $value ): int {
		$int = (int) $value;

		return ( $int >= 0 && $int <= 6 ) ? $int : 1;
	}

	/**
	 * Coerce to boolean, treating common falsey strings as false.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateBool( mixed $value ): bool {
		if ( is_string( $value ) ) {
			return ! in_array( strtolower( trim( $value ) ), array( '', '0', 'false', 'no', 'off' ), true );
		}

		return (bool) $value;
	}

	/**
	 * Sanitize a single-line text setting.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateText( mixed $value ): string {
		return sanitize_text_field( (string) $value );
	}

	/**
	 * Sanitize an optional email setting: a valid address or '' (empty = "use the WP admin email").
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateEmailSetting( mixed $value ): string {
		return sanitize_email( (string) $value );
	}

	/**
	 * Whether a REST write is an acceptable email setting: empty (clear) or a valid address.
	 *
	 * @param mixed $value Raw value.
	 */
	private static function isEmailSetting( mixed $value ): bool {
		if ( ! is_string( $value ) ) {
			return false;
		}
		$trimmed = trim( $value );

		return '' === $trimmed || false !== is_email( $trimmed );
	}

	/**
	 * Sanitize a multi-line text setting.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateTextarea( mixed $value ): string {
		return sanitize_textarea_field( (string) $value );
	}

	/**
	 * Sanitize a hex colour, defaulting when invalid.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateHexColor( mixed $value ): string {
		$color = sanitize_hex_color( (string) $value );

		return is_string( $color ) && '' !== $color ? $color : '#2563eb';
	}

	/**
	 * Sanitize custom CSS by stripping angle brackets (defence against markup injection).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function validateCss( mixed $value ): string {
		return trim( str_replace( array( '<', '>' ), '', (string) $value ) );
	}
}

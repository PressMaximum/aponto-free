<?php
/**
 * Onboarding funnel (local, no phone-home).
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

/**
 * Records the onboarding funnel timestamps in the local option `aponto_funnel`
 * (SPEC-P1 §4): `wizard_completed`, `first_service`, `page_published`,
 * `first_booking` — plus an internal `skipped` flag used to release the setup
 * menu. Each key is stamped at most once (first occurrence wins) with a UTC
 * `Y-m-d H:i:s` timestamp; the values surface in diagnostics.
 *
 * The goal events are wired to plugin actions so they fire regardless of whether
 * the founder used the wizard: creating the FIRST service anywhere (REST editor or
 * the wizard) stamps `first_service` + `wizard_completed`; the first booking
 * stamps `first_booking`.
 */
final class Funnel {

	/**
	 * Option name for the funnel timestamps (autoload off).
	 */
	public const OPTION = 'aponto_funnel';

	/**
	 * Recognised funnel keys.
	 *
	 * @var list<string>
	 */
	private const KEYS = array(
		'wizard_completed',
		'first_service',
		'page_published',
		'first_booking',
		'skipped',
	);

	/**
	 * Internal keys that ride the funnel option but are NOT one-time goal timestamps, so they are
	 * excluded from {@see self::all()} (the diagnostics view + the client funnel map). `resume_step`
	 * is the mutable "where did I leave the wizard" cursor (C10).
	 *
	 * @var list<string>
	 */
	private const INTERNAL_KEYS = array( 'resume_step' );

	/**
	 * The raw funnel option (goal timestamps + internal cursor keys).
	 *
	 * @return array<string, mixed>
	 */
	private function raw(): array {
		$stored = get_option( self::OPTION, array() );

		return is_array( $stored ) ? $stored : array();
	}

	/**
	 * All stamped funnel timestamps (internal cursor keys excluded).
	 *
	 * @return array<string, string>
	 */
	public function all(): array {
		$timestamps = $this->raw();
		foreach ( self::INTERNAL_KEYS as $internal ) {
			unset( $timestamps[ $internal ] );
		}

		return $timestamps;
	}

	/**
	 * Whether a funnel key has been stamped.
	 *
	 * @param string $key Funnel key.
	 */
	public function has( string $key ): bool {
		$all = $this->raw();

		return isset( $all[ $key ] ) && '' !== (string) $all[ $key ];
	}

	/**
	 * Whether the setup flow is finished (goal reached OR explicitly skipped) — the
	 * signal for releasing the collapsed setup menu.
	 */
	public function isComplete(): bool {
		return $this->has( 'wizard_completed' ) || $this->has( 'skipped' );
	}

	/**
	 * Stamp a funnel key once (first occurrence wins).
	 *
	 * @param string $key Funnel key.
	 */
	public function stamp( string $key ): void {
		if ( ! in_array( $key, self::KEYS, true ) || $this->has( $key ) ) {
			return;
		}
		$all         = $this->raw();
		$all[ $key ] = gmdate( 'Y-m-d H:i:s' );
		update_option( self::OPTION, $all, false );
	}

	/**
	 * Upper bound for the wizard resume cursor (review F item 7): generously above the current
	 * 6-step wizard so a future step or two never strands a stored cursor, but low enough that a
	 * bogus client value cannot persist garbage.
	 */
	private const RESUME_STEP_MAX = 8;

	/**
	 * The wizard step the founder last reached (C10 — resume there on reopen instead of restarting
	 * at Welcome; the data was already kept, only the cursor was lost — finding U4). 0-based index
	 * into the wizard STEPS; 0 when never saved or after "Start over". Clamped to 0..8 on both read
	 * and write.
	 */
	public function resumeStep(): int {
		return min( self::RESUME_STEP_MAX, max( 0, (int) ( $this->raw()['resume_step'] ?? 0 ) ) );
	}

	/**
	 * Persist the wizard resume cursor (last-write-wins, unlike the one-time {@see self::stamp()}).
	 * "Start over" sets it back to 0. Clamped to 0..8 (review F item 7).
	 *
	 * @param int $step 0-based step index.
	 */
	public function setResumeStep( int $step ): void {
		$all                = $this->raw();
		$all['resume_step'] = min( self::RESUME_STEP_MAX, max( 0, $step ) );
		update_option( self::OPTION, $all, false );
	}

	/**
	 * Clear a funnel key (used to re-open the wizard after a skip).
	 *
	 * @param string $key Funnel key.
	 */
	public function clear( string $key ): void {
		$all = $this->raw();
		if ( ! array_key_exists( $key, $all ) ) {
			return;
		}
		unset( $all[ $key ] );
		update_option( self::OPTION, $all, false );
	}

	/**
	 * Wire the goal events (fires even when the founder skips the wizard).
	 */
	public function register(): void {
		add_action( 'aponto_service_created', array( $this, 'onServiceCreated' ) );
		add_action( 'aponto_booking_created', array( $this, 'onBookingCreated' ) );
	}

	/**
	 * Goal event: the first service exists — stamp the completion marker.
	 */
	public function onServiceCreated(): void {
		$this->stamp( 'first_service' );
		$this->stamp( 'wizard_completed' );
	}

	/**
	 * The first booking landed.
	 */
	public function onBookingCreated(): void {
		$this->stamp( 'first_booking' );
	}
}

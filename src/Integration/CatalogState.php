<?php
/**
 * Integration 4-state projection for the Modules catalog (extension-surface §4).
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

use Aponto\Booking\Repository\ServiceMetaRepository;
use Aponto\Extension\ModuleRepresentation;
use Aponto\Support\ModuleSecrets;
use Aponto\Support\Settings;

/**
 * Computes the three states the catalog card for an `integration` module needs beyond
 * `available`/`enabled`: `configured`, `connected_count` and `used_count` (extension-surface §4).
 *
 * The layering rule is the contract's, not a nicety: **a later tier can never report true while an
 * earlier one is false.** So a module the plan does not grant reports zeros for all three, whatever
 * rows survive in the database — data outliving a downgrade is expected (D-R31 retention), and it
 * must not resurface as state.
 *
 * `configured` and `connected` are also kept STRICTLY APART, because the card must be able to say
 * two different things: "paste your credentials" and "now connect a staff member". Merging them
 * (extension-surface §4, last paragraph) collapses a two-step setup into one unexplained failure.
 *
 * A `required: true` entry in a module's settings schema is what makes `configured` computable
 * generically. It is an ADDITIVE key on the D-R27 schema shape: the generic settings controller
 * reads `type`/`default`/`secret` and ignores it, so declaring it changes nothing about validation
 * or the secret wire format — it only tells the catalog which fields must be present before the
 * module can do anything at all.
 */
final class CatalogState {

	/**
	 * Construct the projection.
	 *
	 * @param ConnectionStore       $connections  Connection storage.
	 * @param ServiceMetaRepository $service_meta Service metadata repository.
	 * @param Settings              $settings     Settings/module-option reader.
	 * @param \wpdb                 $wpdb         Database handle (active-service count).
	 * @param ModuleSecrets|null    $secrets      Secret helper (verifying a required secret opens).
	 */
	public function __construct(
		private ConnectionStore $connections,
		private ServiceMetaRepository $service_meta,
		private Settings $settings,
		private \wpdb $wpdb,
		private ?ModuleSecrets $secrets = null
	) {
		$this->secrets = $secrets ?? new ModuleSecrets( new \Aponto\Support\Crypto( ConnectionStore::keyMaterial() ) );
	}

	/**
	 * Build from the global handles.
	 */
	public static function make(): self {
		global $wpdb;

		return new self( ConnectionStore::make(), new ServiceMetaRepository( $wpdb ), new Settings(), $wpdb );
	}

	/**
	 * The three integration states for one registry code.
	 *
	 * Non-integration codes and codes this build cannot use answer the all-false shape, so the boot
	 * projection can add these fields to EVERY card without branching on `kind`.
	 *
	 * @param string $code Registry code.
	 * @return array{configured: bool, connected_count: int, used_count: int}
	 */
	public function forModule( string $code ): array {
		$empty = array(
			'configured'      => false,
			'connected_count' => 0,
			'used_count'      => 0,
		);

		if ( ! IntegrationRegistry::isActive( $code ) ) {
			return $empty;
		}

		// STRICT LAYERING (extension-surface §4, Codex P2 #14): `connected` cannot lead `configured`.
		// A site whose credentials were cleared genuinely CANNOT use its stored tokens — the driver
		// has no client to present them with — so reporting "3 staff connected" there describes rows
		// in a table, not a capability, and it is the number that makes an operator stop looking for
		// the real problem one line above.
		$configured = $this->isConfigured( $code );
		$connected  = $configured ? count( $this->connections->activeStaffIds( $code ) ) : 0;

		return array(
			'configured'      => $configured,
			'connected_count' => $connected,
			'used_count'      => $connected > 0 ? $this->usedCount( $code ) : 0,
		);
	}

	/**
	 * Whether every required global field is answered (extension-surface §4 `configured`).
	 *
	 * ### Why this asks the module rather than only the option (D-R39c/A.6)
	 *
	 * It used to read the required paths straight out of `wp_options`, which is right for every
	 * module whose schema has never moved and WRONG for every one whose schema has. A gateway that
	 * changed shape — Stripe at D-R39b, PayPal at D-R40f, both from a single credential set to two —
	 * keeps ADOPTING the old paths on read, deliberately, because the alternative is a write on a
	 * read path that loses a concurrent `PUT`. So the values are there, the gateway is charging real
	 * customers, and this method looked at the canonical paths, found nothing, and reported
	 * `configured: false`: the Modules card said "Setup needed" over a working gateway, on the
	 * founder's own site among others.
	 *
	 * {@see ModuleRepresentation::publish()} is the same three steps the settings route runs — mask,
	 * ask the module what it RESOLVES, normalize the answer back to the schema — so the card and the
	 * panel cannot disagree about one option row. Nothing here knows which module it is looking at.
	 *
	 * A required SECRET must still actually OPEN, not merely be present (Codex P2 #14): a cipher
	 * sealed under key material this site has lost is a string that looks configured and behaves
	 * like a blank field the moment the driver uses it. {@see ModuleRepresentation::satisfies()}
	 * keeps that check where the value is at the canonical path, and accepts the module's own
	 * `{is_set: true}` where it is not — an answer the module reached by the same rule ("a secret
	 * that no longer opens counts as absent", D-R34a).
	 *
	 * @param string $code Module code.
	 */
	private function isConfigured( string $code ): bool {
		$schema = apply_filters( 'aponto_module_settings_schema', null, $code );
		if ( ! is_array( $schema ) || array() === $schema ) {
			return false;
		}

		$stored    = $this->settings->moduleOption( $code );
		$secrets   = $this->secrets->secretKeysFor( $code, 'settings' );
		$published = ModuleRepresentation::publish( $code, $stored, $schema, $secrets, $this->secrets );
		$required  = 0;

		foreach ( $schema as $path => $entry ) {
			if ( ! is_array( $entry ) || true !== ( $entry['required'] ?? false ) ) {
				continue;
			}
			++$required;
			$path      = (string) $path;
			$is_secret = true === ( $entry['secret'] ?? false ) || in_array( $path, $secrets, true );

			if ( ! ModuleRepresentation::satisfies( $published, $stored, $path, $is_secret, $code, 'settings', $this->secrets ) ) {
				return false;
			}
		}

		return $required > 0 ? true : array() !== $stored;
	}

	/**
	 * How many services this integration acts for (extension-surface §4 `used`).
	 *
	 * Two shapes, one meaning. The default is "every bookable service", so the answer is the active
	 * service count; a module that stored `sync_all_services => false` has opted into an explicit
	 * per-service selection, and the answer is the count of services carrying its `used` flag.
	 *
	 * @param string $code Module code.
	 */
	private function usedCount( string $code ): int {
		$option = $this->settings->moduleOption( $code );
		if ( array_key_exists( 'sync_all_services', $option ) && ! (bool) $option['sync_all_services'] ) {
			return count( $this->service_meta->enabledServiceIds( IntegrationRegistry::usageKey( $code ) ) );
		}

		$table = $this->wpdb->prefix . 'aponto_services';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE status = %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the status is bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, 'active' ) );
	}
}

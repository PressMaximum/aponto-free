<?php
/**
 * Operational repair pass used by `wp aponto fixer`.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Cli;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\ManageToken;
use Aponto\Booking\TokenGenerator;
use Aponto\Database\Migrator;
use Aponto\Installation\Capabilities;
use Aponto\Installation\Cron;
use Aponto\Installation\Seeder;

/** Repairs schema drift, seed notification templates, administrator capabilities and the cleanup schedule. */
final class Fixer {

	/**
	 * Construct the fixer.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Run all repair steps without aborting the report after the first failure.
	 *
	 * @return array{ok:bool,items:list<array{status:'OK'|'FIXED'|'FAIL',item:string,message:string}>}
	 */
	public function run(): array {
		$items    = array();
		$migrator = new Migrator( $this->wpdb );
		$before   = $migrator->verifyCoreSchemaHealth();
		$result   = $migrator->run();
		$after    = $migrator->verifyCoreSchemaHealth();

		if ( ! $result->ok || null !== $after ) {
			$message = $result->busy ? 'Migration lock is busy.' : ( $result->error ?? $after ?? 'Schema repair failed.' );
			$items[] = $this->item( 'FAIL', 'schema', $message );
		} else {
			delete_option( Migrator::ERROR_OPTION );
			$items[] = $this->item( null === $before ? 'OK' : 'FIXED', 'schema', null === $before ? 'Schema is healthy.' : 'Schema drift repaired.' );
		}

		$items[] = $this->repairTemplates();
		$items[] = $this->repairManageTokenSecret();

		$role         = get_role( 'administrator' );
		$missing_caps = null === $role || $this->missingCaps( $role );
		Capabilities::grant();
		$role = get_role( 'administrator' );
		if ( null === $role || $this->missingCaps( $role ) ) {
			$items[] = $this->item( 'FAIL', 'capabilities', 'Administrator capabilities could not be granted.' );
		} else {
			$items[] = $this->item( $missing_caps ? 'FIXED' : 'OK', 'capabilities', $missing_caps ? 'Administrator capabilities restored.' : 'Administrator capabilities are present.' );
		}

		$cron_missing = false === wp_next_scheduled( Cron::HOOK );
		Cron::schedule();
		if ( false === wp_next_scheduled( Cron::HOOK ) ) {
			$items[] = $this->item( 'FAIL', 'cron', 'Cleanup cron could not be scheduled.' );
		} else {
			$items[] = $this->item( $cron_missing ? 'FIXED' : 'OK', 'cron', $cron_missing ? 'Cleanup cron restored.' : 'Cleanup cron is scheduled.' );
		}

		$ok = ! in_array( 'FAIL', array_column( $items, 'status' ), true );
		return array(
			'ok'    => $ok,
			'items' => $items,
		);
	}

	/**
	 * Reseed every notification template the installer owns (QA run 2 BUG-6).
	 *
	 * The schema step above re-runs the idempotent DDL and, on a site that has reached version 9,
	 * migration 0009's own `up()` — which seeds the TWO payment templates. It knows nothing about the
	 * eleven core booking templates, which the {@see Seeder} installs at activation. So a site whose
	 * `aponto_notifications` table had been emptied (a truncating test run, a bad restore) came out
	 * of `wp aponto fixer` with two rows, no confirmation or cancellation copy at all, and a report
	 * that said "Schema drift repaired". A repair that leaves a site silently unable to send mail
	 * must not be reported as success.
	 *
	 * The seeder is idempotent per `template_key`, so this is a no-op on a healthy site — and the
	 * before/after counts are what let the report say `OK` or `FIXED` honestly.
	 *
	 * @return array{status:'OK'|'FIXED'|'FAIL',item:string,message:string}
	 */
	private function repairTemplates(): array {
		$seeder = new Seeder( $this->wpdb );
		$before = $seeder->missingTemplateKeys();

		if ( array() === $before ) {
			return $this->item( 'OK', 'templates', 'Notification templates are present.' );
		}

		$seeder->seed();
		$after = $seeder->missingTemplateKeys();

		if ( array() !== $after ) {
			return $this->item(
				'FAIL',
				'templates',
				sprintf( '%d notification template(s) could not be restored.', count( $after ) )
			);
		}

		return $this->item(
			'FIXED',
			'templates',
			sprintf( '%d notification template(s) restored.', count( $before ) )
		);
	}

	/**
	 * Replace a manage-token derivation secret that no longer opens (D-R39d).
	 *
	 * THIS is the surface that rotation belongs on, and the reason is the multi-node case: nodes
	 * holding different but individually usable `SECURE_AUTH_KEY`s each open only their own blob, so
	 * a rotation driven by runtime traffic would have the two nodes overwriting each other forever.
	 * A repair command is run once, by a person who knows whether the key change was intended.
	 *
	 * A healthy site is `OK` and writes nothing, so running the fixer twice rotates once. `no_key` is
	 * reported as `OK` rather than `FAIL`: it is a wp-config condition this command cannot repair,
	 * and the `SECURE_AUTH_KEY` Site Health test already tells that story with the instructions.
	 *
	 * @return array{status:'OK'|'FIXED'|'FAIL',item:string,message:string}
	 */
	private function repairManageTokenSecret(): array {
		switch ( ( new ManageToken( $this->wpdb, new TokenGenerator() ) )->repair() ) {
			case ManageToken::REPAIR_ROTATED:
				return $this->item( 'FIXED', 'manage_token_secret', 'Booking-link secret replaced; the previous one is kept in aponto_manage_token_secret_prev.' );
			case ManageToken::REPAIR_NO_KEY:
				return $this->item( 'OK', 'manage_token_secret', 'Booking links need a unique SECURE_AUTH_KEY in wp-config.php.' );
			case ManageToken::REPAIR_FAILED:
				return $this->item( 'FAIL', 'manage_token_secret', 'Booking-link secret could not be replaced.' );
			default:
				return $this->item( 'OK', 'manage_token_secret', 'Booking-link secret is readable.' );
		}
	}

	/**
	 * Whether any managed administrator capability is absent.
	 *
	 * @param \WP_Role $role Administrator role.
	 */
	private function missingCaps( \WP_Role $role ): bool {
		foreach ( Capabilities::CAPS as $cap ) {
			if ( ! $role->has_cap( $cap ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Build one stable report item.
	 *
	 * @param 'OK'|'FIXED'|'FAIL' $status  Status.
	 * @param string              $item    Item key.
	 * @param string              $message Human-readable result.
	 * @return array{status:'OK'|'FIXED'|'FAIL',item:string,message:string}
	 */
	private function item( string $status, string $item, string $message ): array {
		return array(
			'status'  => $status,
			'item'    => $item,
			'message' => $message,
		);
	}
}

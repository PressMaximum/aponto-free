<?php
/**
 * Admin `/settings` controller (rest-contract §2.11).
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

use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Support\Settings;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Reads and writes the core settings registry. This route is CORE-ONLY: it touches nothing but the
 * `aponto_settings` option through {@see Settings}, never a module option. Settings stores flat,
 * dotted keys (`business.name`); the REST DTO is the nested object those dots imply, so the
 * controller groups keys by first segment on the way out and walks the dotted path on the way in.
 * `PUT` is a full replacement: any schema key absent from the body resets to that schema entry's
 * resolved default. Clients preserving values must round-trip the complete GET payload (D-16).
 * Schema entries marked `rest => false` (the notification sender identity — Codex review E item 4)
 * are OUTSIDE this surface entirely: GET omits them and the full-replacement PUT neither writes nor
 * resets them, so omitting the group can never clobber values owned by another route.
 *
 * Lightweight optimistic concurrency (rest-contract §2.11 addendum 2026-07-19 C1): the DTO carries
 * a `revision` int; a PUT that sends a stale `revision` is rejected `409 aponto_settings_conflict`
 * before any write. `revision` is not a settings value — solo-admin P1 posture; full ETag/If-Match
 * is a P2 concern if multi-admin arrives.
 */
final class SettingsController implements Controller {

	/**
	 * Core settings registry (source of truth).
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->settings = $services->settings();
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'index' ),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'update' ),
				),
			)
		);
	}

	/**
	 * GET /settings.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function index( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		return new WP_REST_Response( $this->toDto( $this->settings ), 200 );
	}

	/**
	 * PUT /settings (full replacement).
	 *
	 * Every schema key is resolved from the request body (by dotted path) or its schema default.
	 * The complete payload is strict-validated before any write, so coercive read/internal
	 * validators cannot hide invalid REST input and a 422 never leaves a partial replacement.
	 *
	 * Concurrency (§2.11 addendum 2026-07-19 C1): when the body carries `revision` and it does not
	 * match the current write revision, the whole PUT is rejected 409 before validation/writes —
	 * the client reloads instead of silently overwriting another writer. A body without `revision`
	 * is accepted unchecked (additive contract: pre-addendum clients and scripted writes keep
	 * working; the admin UI always round-trips it).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update( WP_REST_Request $request ) {
		if ( $request->has_param( 'revision' ) && (int) $request->get_param( 'revision' ) !== $this->settings->revision() ) {
			return Errors::settingsConflict();
		}

		$fields = array();
		$values = array();

		$schema = $this->settings->schema();
		foreach ( $schema as $key => $entry ) {
			if ( ! Settings::restExposed( $entry ) ) {
				continue; // REST-hidden key (e.g. the notification sender): never written, never reset (item 4).
			}
			$value          = $this->resolve( $request, $key, $entry['default'] );
			$values[ $key ] = $value;
			try {
				$this->settings->validate( $key, $value, true );
			} catch ( \InvalidArgumentException $e ) {
				unset( $e );
				$fields[ $key ] = __( 'This value is invalid.', 'aponto' );
			}
		}

		if ( array() !== $fields ) {
			return Errors::validation( $fields );
		}
		foreach ( $values as $key => $value ) {
			$this->settings->update( $key, $value, true );
		}

		return new WP_REST_Response( $this->toDto( $this->settings ), 200 );
	}

	/**
	 * Resolve one setting's incoming value: the request body wins when the dotted path is present,
	 * otherwise the schema default is used (full-replacement semantics).
	 *
	 * @param WP_REST_Request $request Request.
	 * @param string          $key     Dotted setting key.
	 * @param mixed           $default_value Resolved schema default.
	 * @return mixed
	 */
	private function resolve( WP_REST_Request $request, string $key, mixed $default_value ) {
		$dot = strpos( $key, '.' );
		if ( false === $dot ) {
			return $request->has_param( $key ) ? $request->get_param( $key ) : $default_value;
		}

		$group  = substr( $key, 0, $dot );
		$leaf   = substr( $key, $dot + 1 );
		$bucket = $request->get_param( $group );
		if ( is_array( $bucket ) && array_key_exists( $leaf, $bucket ) ) {
			return $bucket[ $leaf ];
		}

		return $default_value;
	}

	/**
	 * Build the nested settings DTO from the flat, dotted schema. Each `group.leaf` key becomes
	 * `group => array( leaf => value )`; a dotless key stays top-level. Values are whatever
	 * {@see Settings::get()} returns (e.g. `appearance.radius` is an int). The trailing `revision`
	 * (§2.11 addendum) is the concurrency token the client echoes back on PUT — not a setting.
	 *
	 * @param Settings $settings Core settings registry.
	 * @return array<string, mixed>
	 */
	private function toDto( Settings $settings ): array {
		$dto = array( 'revision' => $settings->revision() );

		foreach ( $settings->schema() as $key => $entry ) {
			if ( ! Settings::restExposed( $entry ) ) {
				continue; // REST-hidden key: not exposed on GET /settings either (item 4).
			}
			$value = $settings->get( $key );
			$dot   = strpos( $key, '.' );
			if ( false === $dot ) {
				$dto[ $key ] = $value;
				continue;
			}

			$group = substr( $key, 0, $dot );
			$leaf  = substr( $key, $dot + 1 );
			if ( ! isset( $dto[ $group ] ) || ! is_array( $dto[ $group ] ) ) {
				$dto[ $group ] = array();
			}
			$dto[ $group ][ $leaf ] = $value;
		}

		return $dto;
	}
}

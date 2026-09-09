<?php
/**
 * Bridge: `aponto_get_settings_fields_{key}` → the generic module settings schema
 * (extension-surface §5.1, §5.3).
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

/**
 * Lets an integration driver describe its global configuration through its OWN per-key verb
 * (`aponto_get_settings_fields_{key}`, extension-surface §5.1) while the generic settings
 * controller keeps reading exactly one filter (`aponto_module_settings_schema`, §5.3).
 *
 * ### Recorded deviation from extension-surface §5.1
 *
 * §5.1 types the verb's return as `array<string, Aponto\Settings\FieldDefinition>`. That class does
 * not exist and nothing else would use it: the generic controller (D-R27) consumes the FLAT
 * `dotted-path => {type, default, secret}` map, and it is that map — not a richer object — that
 * decides validation, secret sealing and the `{keep:true}` wire semantics. Introducing a second
 * vocabulary would mean translating between them at exactly the point where a mistranslation
 * silently unseals a secret. So the verb returns the SAME flat schema the controller already
 * understands, and this class is the whole of the bridge. The dispatch, the ordering and the
 * per-key hook name are unchanged; only the payload type differs, and the difference is logged
 * here and in `docs/decisions-p0-rest.md` (D-R34) rather than applied silently.
 *
 * The bridge dispatches ONLY for `kind === 'integration'` codes the plan grants, so a module that
 * prefers to own a domain resource instead (D-R29/D-R30) is untouched and its `/settings` route
 * keeps answering its uniform 404.
 */
final class SettingsFields {

	/**
	 * Attach to the generic schema filter.
	 */
	public function register(): void {
		add_filter( 'aponto_module_settings_schema', array( $this, 'schema' ), 10, 2 );
	}

	/**
	 * Build an integration's settings schema from its driver verb.
	 *
	 * @param mixed  $schema Schema contributed so far (null when nothing registered one).
	 * @param string $code   Module code.
	 * @return array<string, mixed>|null
	 */
	public function schema( $schema, $code = '' ) {
		$code = (string) $code;
		if ( is_array( $schema ) && array() !== $schema ) {
			return $schema; // Another contributor already owns this code.
		}
		if ( ! IntegrationRegistry::isActive( $code ) ) {
			return $schema;
		}

		/**
		 * Filter an integration's global settings fields (extension-surface §5.1).
		 *
		 * The shape is the generic module schema: `dotted-path => array{type, default, secret?}`.
		 * A `secret: true` path is sealed with {@see \Aponto\Support\ModuleSecrets} before storage
		 * and masked to `{is_set: bool}` on read — it never leaves the server in plaintext.
		 *
		 * @param array<string, mixed> $fields  Fields contributed so far (initial `[]`).
		 * @param SettingsFieldContext $context Module code + the derived OAuth redirect URI.
		 */
		$fields = apply_filters(
			'aponto_get_settings_fields_' . $code,
			array(),
			new SettingsFieldContext( $code, IntegrationRegistry::redirectUri() )
		);

		if ( ! is_array( $fields ) || array() === $fields ) {
			return $schema;
		}

		return $fields;
	}
}

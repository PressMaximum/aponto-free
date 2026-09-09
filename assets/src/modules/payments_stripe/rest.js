/**
 * The Stripe panel's wire helpers — the secret markers, the settings body, the mode derivation
 * and the error copy (D-17 / extension-surface §5.3.4, D-R39).
 *
 * Kept out of the component because these are the parts most worth testing directly: a mistake in
 * the SECRET markers does not look like a bug, it looks like the site owner's live secret key
 * quietly becoming an empty string, and a mistake in the MODE derivation tells somebody they are
 * in test mode while real cards are being charged.
 *
 * DELIBERATELY A SECOND COPY of the secret helpers `assets/src/pro/calendar_google/rest.js` also
 * carries. `assets/src/pro/**` is physically excluded from the Free zip (distribution.json) and
 * `payments_stripe` is a FREE module (D-R22/D-R39), so importing them would put a Free panel's
 * behaviour in a file that Free sites do not receive. The shared home for them is the panel host,
 * which owns no wire code at all today; extracting one is a change to the host contract, not to
 * this module, so it is written down here rather than done in passing.
 */

import { __, sprintf } from '@wordpress/i18n';

/** The three states a secret field can be in when the form is submitted. */
export const SECRET_KEEP = 'keep';
export const SECRET_REPLACE = 'replace';
export const SECRET_CLEAR = 'clear';

/** The module's registry code — the URL segment of every route this panel talks to. */
export const MODULE_CODE = 'payments_stripe';

/**
 * The two key sets a site holds, in the order the panel renders them (D-R39b).
 *
 * A site keeps BOTH: `mode` names the one in force, and the other stays stored so switching back
 * costs no retyping. Every place that walks the sets — the settings body, the completeness pills,
 * the two key cards — walks this list, so adding a third would never be a rename hunt.
 */
export const MODES = [ 'test', 'live' ];

/**
 * The wire value for a secret field.
 *
 * `{keep: true}` retains the stored cipher untouched (it is never re-encrypted), a non-empty string
 * REPLACES it, and `null` CLEARS it. Deliberately NOT "empty string means keep" — that is the
 * footgun extension-surface §5.3.4 rules out by name, because it makes "I cleared this field" and
 * "I did not touch this field" indistinguishable.
 *
 * @param {string} mode  One of the SECRET_* constants.
 * @param {string} value Typed value, when replacing.
 * @return {Object|string|null} The wire value.
 */
export function secretWireValue( mode, value ) {
	if ( SECRET_REPLACE === mode ) {
		const typed = String( value || '' ).trim();

		// A "replace" with nothing typed is a clear, not an empty replacement: storing '' would be
		// the same end state, but saying so explicitly keeps the server's branch unambiguous.
		return '' === typed ? null : typed;
	}

	return SECRET_CLEAR === mode ? null : { keep: true };
}

/**
 * The full-replacement settings body.
 *
 * PUT is a FULL replacement (rest-contract §2.12 / `ModulesController::update()`), so every schema
 * key travels every time — a key left out is a key reset to its default, which for a receipt toggle
 * the owner turned off would silently turn it back on. That now includes the OTHER mode's set and
 * both endpoint ids: flipping the switch must not cost the owner the credentials they are switching
 * away from, which is the whole point of D-R39b.
 *
 * @param {Object} form Panel form state.
 * @return {Object} Request body.
 */
export function settingsBody( form ) {
	const settings = {
		mode: 'live' === form.mode ? 'live' : 'test',
		send_receipt: !! form.sendReceipt,
		statement_descriptor_suffix: String( form.descriptorSuffix || '' ).trim(),
	};

	MODES.forEach( ( mode ) => {
		const set = ( form.sets && form.sets[ mode ] ) || {};
		settings[ `${ mode }_publishable_key` ] = String( set.publishableKey || '' ).trim();
		settings[ `${ mode }_secret_key` ] = secretWireValue( set.secretMode, set.secretValue );
		settings[ `${ mode }_webhook_secret` ] = secretWireValue( set.webhookMode, set.webhookValue );
		settings[ `webhook_endpoint_id_${ mode }` ] = String( set.endpointId || '' );
	} );

	return { settings };
}

/**
 * One mode set, read out of a settings response.
 *
 * A secret comes back as `{is_set: bool}` and never as a value, so both secret fields start in
 * `keep` mode — there is nothing to prefill, and prefilling a fake value would invite the owner to
 * "correct" it into a real clear.
 *
 * @param {Object} settings Settings object.
 * @param {string} mode     `test` or `live`.
 * @return {Object} Set state.
 */
function setFromSettings( settings, mode ) {
	const publishable = settings[ `${ mode }_publishable_key` ];
	const secret = settings[ `${ mode }_secret_key` ];
	const webhook = settings[ `${ mode }_webhook_secret` ];
	const endpoint = settings[ `webhook_endpoint_id_${ mode }` ];

	return {
		publishableKey: typeof publishable === 'string' ? publishable : '',
		secretIsSet: !! ( secret && secret.is_set ),
		secretMode: SECRET_KEEP,
		secretValue: '',
		webhookIsSet: !! ( webhook && webhook.is_set ),
		webhookMode: SECRET_KEEP,
		webhookValue: '',
		endpointId: typeof endpoint === 'string' ? endpoint : '',
	};
}

/**
 * Read a settings response into panel form state.
 *
 * `send_receipt` reads as FALSE when absent. Unlike the Google panel's two sync switches, letting
 * Stripe email the customer is an action taken on the site's behalf towards its customers, so the
 * conservative reading of an unknown state is "we are not doing that". `mode` reads as TEST when
 * absent for the same reason, one size larger: a panel that guessed "live" would tell an owner
 * mid-setup that real cards are being charged.
 *
 * @param {Object} response GET/PUT response.
 * @return {Object} Form state.
 */
export function formFromSettings( response ) {
	const settings = ( response && response.settings ) || {};

	return {
		mode: 'live' === settings.mode ? 'live' : 'test',
		sets: {
			test: setFromSettings( settings, 'test' ),
			live: setFromSettings( settings, 'live' ),
		},
		sendReceipt: true === settings.send_receipt,
		descriptorSuffix:
			typeof settings.statement_descriptor_suffix === 'string' ? settings.statement_descriptor_suffix : '',
	};
}

/**
 * Whether one mode set holds all three credentials — the question the status line answers.
 *
 * A secret counts when it is SAVED (`is_set`) or about to be, and stops counting the moment the
 * owner stages a clear: "Live keys saved" must not stay on screen above a form that is one Save
 * away from emptying them.
 *
 * @param {Object} set One set's form state.
 * @return {boolean} Whether the set is complete.
 */
export function setIsComplete( set ) {
	if ( ! set ) {
		return false;
	}
	const has = ( isSet, mode, value ) => {
		if ( SECRET_CLEAR === mode ) {
			return false;
		}
		if ( SECRET_REPLACE === mode ) {
			return '' !== String( value || '' ).trim();
		}

		return !! isSet;
	};

	return (
		'' !== String( set.publishableKey || '' ).trim() &&
		has( set.secretIsSet, set.secretMode, set.secretValue ) &&
		has( set.webhookIsSet, set.webhookMode, set.webhookValue )
	);
}

/**
 * The one-line status under the mode switch.
 *
 * Named for the ACTIVE mode, because that is the one that decides whether the booking form can take
 * a card. "Setup needed" is not a warning about the panel — it is the reason the customer sees no
 * card field, and saying so here is what stops an owner hunting through the booking settings.
 *
 * @param {string} mode Active mode.
 * @param {Object} sets Both sets.
 * @return {{tone: string, text: string}} Status line.
 */
export function modeStatus( mode, sets ) {
	const active = 'live' === mode ? 'live' : 'test';
	const complete = setIsComplete( sets && sets[ active ] );

	if ( complete ) {
		return {
			tone: 'is-ok',
			text:
				'live' === active
					? __( 'Live keys saved · signing secret saved', 'aponto' )
					: __( 'Test keys saved · signing secret saved', 'aponto' ),
		};
	}

	return {
		tone: 'is-warn',
		text:
			'live' === active
				? __( 'Live set incomplete — add the 3 keys below. No card payment is offered until you do.', 'aponto' )
				: __( 'Test set incomplete — add the 3 keys below. No card payment is offered until you do.', 'aponto' ),
	};
}

/**
 * The mode a pasted key belongs to, or `''`.
 *
 * No longer decides the panel's mode — that is the switch now (D-R39b) — but it still tells the
 * owner IMMEDIATELY that they have pasted a live key into the Test box, before the server's 422
 * says the same thing on save.
 *
 * @param {string} key Publishable or secret key as typed.
 * @return {'test'|'live'|''} The key's own mode.
 */
export function modeOfKey( key ) {
	const value = String( key || '' ).trim();
	if ( /^(pk|sk|rk)_test_/.test( value ) ) {
		return 'test';
	}

	return /^(pk|sk|rk)_live_/.test( value ) ? 'live' : '';
}

/**
 * Whether this admin screen is being served from a host Stripe could never reach.
 *
 * A local site cannot receive a delivery, so offering "Register webhook with Stripe" there would
 * create an endpoint at an unreachable URL and hand back a secret for events that never arrive.
 * The CLI note is the honest alternative, and it is what the developer actually needs.
 *
 * @param {string} host Hostname.
 * @return {boolean} Whether the host is local-only.
 */
export function isLocalHost( host ) {
	const value = String( host || '' ).toLowerCase();

	return (
		'localhost' === value ||
		'127.0.0.1' === value ||
		'::1' === value ||
		value.endsWith( '.local' ) ||
		value.endsWith( '.test' ) ||
		value.endsWith( '.localhost' )
	);
}

/**
 * The readiness tokens the server may send in `status.reason` (shared vocabulary with the PayPal
 * panel, so the two gateways cannot describe the same state differently).
 *
 * `REASON_WEBHOOK_ENVIRONMENT_MISMATCH` was a fourth constant here and is gone with the token itself
 * (D-R40f): it belonged to PayPal's single-credential-set shape, which no longer exists, so
 * `ModuleStatus::REASONS` cannot emit it and a constant nothing can equal is dead vocabulary.
 */
export const REASON_NOT_CONFIGURED = 'not_configured';
export const REASON_MODULE_INACTIVE = 'module_inactive';
export const REASON_UNSUPPORTED_CURRENCY = 'unsupported_currency';

/**
 * The server's readiness report from a settings GET/PUT, or null.
 *
 * ADDITIVE (rest-contract §2.12): a server older than this bundle sends no `status` key, which reads
 * as null and leaves every caller on the derivation it used before.
 *
 * @param {Object} response GET/PUT response.
 * @return {?{ready: ?boolean, reason: string, message: string, webhookUrl: string, webhookEvents: ?Array<string>}} Status.
 */
export function statusFromSettings( response ) {
	const status = response && response.status;
	if ( ! status || 'object' !== typeof status || Array.isArray( status ) ) {
		return null;
	}
	const events = Array.isArray( status.webhook_events )
		? status.webhook_events.filter( ( event ) => 'string' === typeof event && '' !== event )
		: null;

	return {
		ready: 'boolean' === typeof status.ready ? status.ready : null,
		reason: 'string' === typeof status.reason ? status.reason : '',
		message: 'string' === typeof status.message ? status.message : '',
		webhookUrl: 'string' === typeof status.webhook_url ? status.webhook_url : '',
		webhookEvents: events && events.length ? events : null,
	};
}

/**
 * The sentence for one server readiness token, or '' when this file has no copy for it.
 *
 * A token with no entry answers '' and the caller falls through to the server's own message — the
 * same mechanism {@link testResultLine} uses. The panel never invents a reason the server did not
 * give.
 *
 * @param {string} reason    Token from `status.reason`.
 * @param {Object} [context] `{currency}` — the site currency, from admin boot data.
 * @return {string} Sentence, or ''.
 */
export function reasonDetail( reason, context = {} ) {
	if ( REASON_NOT_CONFIGURED === reason ) {
		return __(
			'Stripe is not offered at checkout until the publishable key and secret key below are saved.',
			'aponto'
		);
	}
	if ( REASON_MODULE_INACTIVE === reason ) {
		return __(
			'The Stripe module is switched off for this site, so the gateway is not offered at checkout.',
			'aponto'
		);
	}
	if ( REASON_UNSUPPORTED_CURRENCY === reason ) {
		return context.currency
			? sprintf(
					/* translators: %s: the site's ISO-4217 currency code, e.g. "VND". */
					__(
						'Stripe does not accept payments in %s, so it is not offered at checkout. Change the site currency, or take payments with another method.',
						'aponto'
					),
					String( context.currency ).toUpperCase()
			  )
			: __(
					'Stripe does not accept payments in this site’s currency, so it is not offered at checkout.',
					'aponto'
			  );
	}

	return '';
}

/**
 * The "Setup needed" banner when the SERVER says the gateway is not ready, or null.
 *
 * Null is the normal answer and means "nothing to add": either the server said nothing (a build
 * older than the `status` key) or it said ready, and in both cases the panel shows its derived
 * test/live banner instead ({@see modeBanner}). Readiness is not derivable here — a site currency
 * Stripe does not take is a fact only the server holds (Codex r1 #14) — so this is a REPORT, never
 * a derivation.
 *
 * @param {?Object} status     Server readiness ({@see statusFromSettings}).
 * @param {string}  [currency] Site currency, for the token whose copy names it.
 * @return {?{tone: string, title: string, detail: string}} Banner, or null.
 */
export function readinessLine( status, currency = '' ) {
	if ( ! status || false !== status.ready ) {
		return null;
	}

	return {
		tone: 'is-setup',
		title: __( 'Setup needed', 'aponto' ),
		detail:
			reasonDetail( status.reason, { currency } ) ||
			status.message ||
			reasonDetail( REASON_NOT_CONFIGURED ),
	};
}

/**
 * The endpoint to paste into Stripe — the SERVER's `rest_url()`, and NOTHING else (Codex r1 #18,
 * r2 B5; D-R40b).
 *
 * The browser origin is not always the address Stripe can reach: an admin working through an
 * internal hostname, a reverse proxy, or one of several domains mapped to the same site would be
 * shown a URL that resolves for them and for nobody else. WordPress knows the canonical one; the
 * panel's job is to DISPLAY it, not to derive it.
 *
 * There is therefore no fallback. A server too old to publish `status.webhook_url` answers '' here
 * and the panel prints a reload line instead: a URL this side constructed is one an operator
 * REGISTERS WITH STRIPE, where being wrong is silent until the day a customer closes the tab
 * mid-payment or a refund is made from the dashboard.
 *
 * @param {?Object} status Server readiness ({@see statusFromSettings}).
 * @return {string} Absolute webhook URL, or '' when the server published none.
 */
export function webhookEndpoint( status ) {
	return ( status && status.webhookUrl ) || '';
}

/**
 * The events to subscribe — the SERVER's list, and NOTHING else (Codex r1 #3, r2 B5; D-R40b).
 *
 * The driver decides which events mean anything to this site, so the driver is what is read off. A
 * second copy on THIS side of the wire is the one nothing can check against the driver, and it
 * drifts — a subscription narrower than the driver loses money that arrived after the tab was
 * closed, which is how `refund.created`/`refund.updated` came to matter (QA BUG-1). An empty list
 * means "the server did not say".
 *
 * @param {?Object} status Server readiness ({@see statusFromSettings}).
 * @return {Array<string>} Event names, empty when the server published none.
 */
export function webhookEvents( status ) {
	return ( status && status.webhookEvents ) || [];
}

/**
 * Turn a failed settings request into copy a site owner can act on.
 *
 * `rest_no_route` is the one that matters: it means the module stopped booting since this page
 * loaded (someone switched it off, or a deploy changed the edition). WordPress's own string — "No
 * route was found matching the URL and request method" — reads as a broken plugin, so the panel
 * contract (`admin/modules/ModuleSettingsRoute.jsx`) requires mapping it.
 *
 * @param {Object} error    Failed apiFetch error.
 * @param {string} fallback Message when nothing better is known.
 * @return {string} Message.
 */
export function friendlyError( error, fallback ) {
	const code = error && error.code ? String( error.code ) : '';

	if ( 'rest_no_route' === code || 'aponto_not_found' === code ) {
		return __( 'Stripe payments are not active on this site. Reload the page to continue.', 'aponto' );
	}
	if ( 'aponto_driver_missing' === code ) {
		return __( 'The Stripe driver is not loaded on this site.', 'aponto' );
	}
	if ( 'aponto_internal' === code && error && error.message ) {
		// The one 500 with copy worth showing verbatim: `ModulesController::update()` refuses to
		// store a secret on a site with no unique SECURE_AUTH_KEY and says exactly how to fix it.
		return error.message;
	}

	return ( error && error.message ) || fallback;
}

/**
 * The server's 422 field map, or `{}`.
 *
 * Rendered GENERICALLY under whichever field the server named (`data.fields`, keyed by the schema's
 * dotted path) rather than re-implemented here: prefix rules, length caps and currency support are
 * the driver's to state, and a client that guessed at them would eventually contradict the server.
 *
 * @param {Object} error Failed apiFetch error.
 * @return {Object<string, string>} Field errors.
 */
export function fieldErrors( error ) {
	const fields = error && error.data && error.data.fields;

	return fields && typeof fields === 'object' && ! Array.isArray( fields ) ? fields : {};
}

/**
 * The result line for `POST /modules/payments_stripe/test`.
 *
 * The route answers `{ok, code, message}` (`IntegrationsController::test()`), and a driver that is
 * not loaded answers `501 aponto_driver_missing` from core itself — which is the state a Free site
 * is in between "the module shipped" and "the driver merged". Both are rendered as an honest line
 * with a status dot, never as a silent no-op.
 *
 * @param {Object} result Response body, or a normalized error.
 * @return {{tone: string, message: string}} Presentation.
 */
export function testResultLine( result ) {
	const code = result && result.code ? String( result.code ) : '';
	const ok = !! ( result && result.ok );

	if ( ok ) {
		return {
			tone: 'is-ok',
			// The driver's own message names the connected account, which is the useful half; the
			// fallback only has to say the keys work.
			message: ( result && result.message ) || __( 'Stripe answered. Your keys work.', 'aponto' ),
		};
	}

	const known = {
		aponto_driver_missing: __( 'The Stripe driver is not loaded on this site.', 'aponto' ),
		not_configured: __( 'Add your publishable key and secret key first.', 'aponto' ),
		invalid_key: __( 'Stripe rejected the secret key. Check that you copied the whole key.', 'aponto' ),
		unreachable: __(
			'Aponto could not reach Stripe. Check the site’s outbound connection and try again.',
			'aponto'
		),
	};

	return {
		tone: 'aponto_driver_missing' === code || 'not_configured' === code ? 'is-warn' : 'is-error',
		message: known[ code ] || ( result && result.message ) || __( 'The connection test did not succeed.', 'aponto' ),
	};
}

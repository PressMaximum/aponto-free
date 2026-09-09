/**
 * Stripe settings panel — the `#modules/payments_stripe` surface (D-R39, D-R39b).
 *
 * Six sections, in the order the setup actually happens, because it IS a sequence and a panel that
 * hides that makes step three look broken:
 *
 *   1. **What this does** — one short paragraph. The card's own sentence is rendered by the host
 *      above this panel, so nothing here repeats it.
 *   2. **Mode** — a two-option switch, Test or Live, and a one-line status saying whether the
 *      chosen mode is actually set up. The mode is a SETTING (D-R39b), not something derived from
 *      the key prefix: deriving it meant the site could hold one key set, so going live destroyed
 *      the test setup and there was no way back without re-pasting credentials.
 *   3. **Test keys** and 4. **Live keys** — one card each, both stored, the inactive one collapsed.
 *      Each holds a publishable key (plain), a secret key and a signing secret (saved / Replace /
 *      Clear), plus the endpoint note and the one-click "Register webhook with Stripe" button.
 *      Stripe issues a DIFFERENT signing secret per mode, which the copy says out loud because it
 *      is the single most common way a live launch silently stops recording payments.
 *   5. **Test connection** — one probe against the ACTIVE mode's saved keys, answered as a line
 *      with a status dot. A driver that is not loaded answers `501 aponto_driver_missing` from core
 *      itself, and that is reported honestly instead of read as a failure of the owner's keys.
 *   6. **Options** — the two settings that are Stripe's rather than Aponto's: whether Stripe emails
 *      its own receipt, and the suffix on the customer's bank statement.
 *
 * WHAT IS DELIBERATELY NOT HERE: whether payment is off/optional/required, how long a slot is held,
 * and whether a paid booking auto-confirms. Those are BOOKING policy — they apply to every gateway,
 * PayPal included — so they live in Settings → Booking → Payments, and the footer note says so
 * rather than duplicating them here where a second gateway would immediately contradict them.
 *
 * SETTINGS ARE HARD-WIRED, NOT SCHEMA-DRIVEN. `GET /modules/{code}/settings` answers `{code,
 * settings}` and does NOT return the schema (`ModulesController::representation()`), so there is
 * nothing generic to render from; the keys below mirror the driver's schema by name. Field-level
 * VALIDATION stays generic: whatever the server names in its 422 `data.fields` map is rendered
 * under that field, so prefix rules and length caps are stated in exactly one place — the driver.
 */

import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	CheckboxControl,
	Notice,
	Spinner,
	TextControl,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import { ensurePanelStyles } from './styles.js';
import {
	MODES,
	MODULE_CODE,
	SECRET_CLEAR,
	SECRET_KEEP,
	SECRET_REPLACE,
	fieldErrors,
	formFromSettings,
	friendlyError,
	isLocalHost,
	modeOfKey,
	modeStatus,
	readinessLine,
	setIsComplete,
	settingsBody,
	statusFromSettings,
	testResultLine,
	webhookEndpoint,
	webhookEvents,
} from './rest.js';

const boot = typeof window !== 'undefined' ? window.apontoAdmin || {} : {};

apiFetch.use( apiFetch.createNonceMiddleware( boot.nonce || '' ) );

const REST = boot.restUrl || boot.restBase || '/wp-json/aponto/v1';
/** The site currency, for the readiness reason whose sentence names it. */
const CURRENCY = boot.currency || '';
const SETTINGS_URL = `${ REST }/modules/${ MODULE_CODE }/settings`;
const TEST_URL = `${ REST }/modules/${ MODULE_CODE }/test`;
const WEBHOOK_ENDPOINT_URL = `${ REST }/stripe/webhook-endpoint`;

/** Statement descriptor suffixes are capped by Stripe at 22 characters. */
const DESCRIPTOR_MAX = 22;

/**
 * Copy text to the clipboard, falling back to a selection when the async API is unavailable
 * (an admin page served over plain HTTP has no `navigator.clipboard`).
 *
 * @param {string} text Text to copy.
 * @return {Promise<boolean>} Whether the copy succeeded.
 */
async function copyText( text ) {
	try {
		if ( navigator.clipboard && window.isSecureContext ) {
			await navigator.clipboard.writeText( text );

			return true;
		}
	} catch ( e ) {
		// Fall through to the legacy path.
	}

	try {
		const field = document.createElement( 'textarea' );
		field.value = text;
		field.setAttribute( 'readonly', '' );
		field.style.position = 'fixed';
		field.style.opacity = '0';
		document.body.appendChild( field );
		field.select();
		const ok = document.execCommand( 'copy' );
		document.body.removeChild( field );

		return ok;
	} catch ( e ) {
		return false;
	}
}

/**
 * The banner's copy + tone for the CHOSEN mode.
 *
 * Exported for the unit tests: this is the one line on the panel that is allowed to reassure
 * somebody that no real money is moving, so it says what the switch says and nothing else. It is
 * the switch rather than the key prefix now (D-R39b), and the two cannot disagree because each key
 * is validated against its own set on the way in.
 *
 * @param {string} mode Active mode.
 * @return {{tone: string, title: string, detail: string}} Banner.
 */
export function modeBanner( mode ) {
	if ( 'live' === mode ) {
		return {
			tone: 'is-live',
			title: __( 'Live mode', 'aponto' ),
			detail: __( 'Real cards will be charged.', 'aponto' ),
		};
	}

	return {
		tone: 'is-test',
		title: __( 'Test mode', 'aponto' ),
		detail: __( 'No real charges. Use Stripe’s test cards to try a booking end to end.', 'aponto' ),
	};
}

/**
 * A secret field with the saved / Replace / Clear treatment (D-17).
 *
 * The same three states as the Google panel's client secret, extracted here because this panel has
 * TWO of them and a second inline copy would be two chances to get the wire markers wrong.
 *
 * @param {Object} props Field props.
 */
function SecretField( {
	label,
	help,
	savedLabel,
	clearLabel,
	keepLabel,
	isSet,
	mode,
	value,
	error,
	onPatch,
} ) {
	return (
		<div className="ap-module-panel__field">
			{ isSet && SECRET_KEEP === mode ? (
				<div className="ap-module-panel__actions">
					<span className="apst-pill is-ok">{ savedLabel }</span>
					<Button variant="secondary" onClick={ () => onPatch( SECRET_REPLACE, '' ) }>
						{ __( 'Replace', 'aponto' ) }
					</Button>
					<Button variant="tertiary" isDestructive onClick={ () => onPatch( SECRET_CLEAR, '' ) }>
						{ __( 'Clear', 'aponto' ) }
					</Button>
				</div>
			) : null }

			{ SECRET_CLEAR === mode ? (
				<div className="ap-module-panel__actions">
					<span className="apst-pill is-warn">{ clearLabel }</span>
					<Button variant="tertiary" onClick={ () => onPatch( SECRET_KEEP, '' ) }>
						{ __( 'Keep it', 'aponto' ) }
					</Button>
				</div>
			) : null }

			{ ! isSet || SECRET_REPLACE === mode ? (
				<>
					<TextControl
						label={ label }
						type="password"
						value={ value }
						autoComplete="off"
						onChange={ ( next ) => onPatch( SECRET_REPLACE, next ) }
						help={ help }
						__nextHasNoMarginBottom
					/>
					{ /* Replace needs the same escape hatch Clear has. Without it the only way back
					     from "I clicked the wrong button" is a page reload — and a reload also
					     discards every other edit on the panel. */ }
					{ isSet ? (
						<div className="ap-module-panel__actions">
							<Button variant="tertiary" onClick={ () => onPatch( SECRET_KEEP, '' ) }>
								{ keepLabel }
							</Button>
						</div>
					) : null }
				</>
			) : null }

			{ error ? <p className="ap-module-panel__error">{ error }</p> : null }
		</div>
	);
}

/**
 * The `#modules/payments_stripe` panel.
 */
export default function PaymentsStripePanel() {
	const [ form, setForm ] = useState( null );
	// The server's own readiness report, when it sends one (Codex r1 #14/#18) — the terms this
	// panel cannot see (a site currency Stripe will not take, a module switched off) plus the
	// canonical webhook URL and the event list the driver actually acts on.
	const [ status, setStatus ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ saving, setSaving ] = useState( false );
	const [ testing, setTesting ] = useState( false );
	const [ testResult, setTestResult ] = useState( null );
	const [ error, setError ] = useState( '' );
	const [ fields, setFields ] = useState( {} );
	const [ notice, setNotice ] = useState( '' );
	const [ copied, setCopied ] = useState( false );
	const [ registering, setRegistering ] = useState( '' );
	const [ openSet, setOpenSet ] = useState( '' );

	useEffect( () => {
		ensurePanelStyles();
	}, [] );

	useEffect( () => {
		let alive = true;
		apiFetch( { url: SETTINGS_URL } )
			.then( ( settings ) => {
				if ( ! alive ) {
					return;
				}
				setForm( formFromSettings( settings ) );
				setStatus( statusFromSettings( settings ) );
				setLoading( false );
			} )
			.catch( ( err ) => {
				if ( ! alive ) {
					return;
				}
				setError( friendlyError( err, __( 'Could not load the Stripe settings.', 'aponto' ) ) );
				setStatus( null );
				// Render the form anyway, from defaults: a site whose driver has not booted still
				// gets a readable screen that explains itself, rather than a bare error card that
				// hides the webhook URL and the local-development note.
				setForm( formFromSettings( {} ) );
				setLoading( false );
			} );

		return () => {
			alive = false;
		};
	}, [] );

	const patch = ( changes ) => {
		setForm( ( prev ) => ( { ...prev, ...changes } ) );
		setNotice( '' );
	};

	const patchSet = ( mode, changes ) => {
		setForm( ( prev ) => ( {
			...prev,
			sets: { ...prev.sets, [ mode ]: { ...prev.sets[ mode ], ...changes } },
		} ) );
		setNotice( '' );
	};

	const registerWebhook = ( mode ) => {
		setRegistering( mode );
		setError( '' );
		setNotice( '' );
		apiFetch( { url: WEBHOOK_ENDPOINT_URL, method: 'POST', data: { mode } } )
			.then( ( res ) => {
				// The signing secret is NOT in this response by design — the server sealed it. So the
				// panel records that the field is now set rather than trying to show a value.
				patchSet( mode, {
					webhookIsSet: true,
					webhookMode: SECRET_KEEP,
					webhookValue: '',
					endpointId: ( res && res.endpoint_id ) || '',
				} );
				setNotice(
					res && res.refreshed
						? __( 'Webhook endpoint updated in Stripe.', 'aponto' )
						: __( 'Webhook endpoint created in Stripe and the signing secret saved.', 'aponto' )
				);
			} )
			.catch( ( err ) => {
				const map = fieldErrors( err );
				setFields( map );
				setError(
					Object.keys( map ).length
						? __( 'Stripe could not register the endpoint — see the fields below.', 'aponto' )
						: friendlyError( err, __( 'Could not register the webhook endpoint with Stripe.', 'aponto' ) )
				);
			} )
			.finally( () => setRegistering( '' ) );
	};

	const clearFieldError = ( key ) =>
		setFields( ( prev ) => {
			if ( ! prev[ key ] ) {
				return prev;
			}
			const next = { ...prev };
			delete next[ key ];

			return next;
		} );

	const save = () => {
		setSaving( true );
		setError( '' );
		setNotice( '' );
		setFields( {} );
		apiFetch( { url: SETTINGS_URL, method: 'PUT', data: settingsBody( form ) } )
			.then( ( res ) => {
				setForm( formFromSettings( res ) );
				setStatus( statusFromSettings( res ) );
				setNotice( __( 'Stripe settings saved.', 'aponto' ) );
				// A saved key can invalidate the last probe, so the old result must not linger and
				// claim the NEW keys were tested.
				setTestResult( null );
			} )
			.catch( ( err ) => {
				const map = fieldErrors( err );
				setFields( map );
				setError(
					Object.keys( map ).length
						? __( 'Some values were not accepted — see the fields below.', 'aponto' )
						: friendlyError( err, __( 'Could not save the Stripe settings.', 'aponto' ) )
				);
			} )
			.finally( () => setSaving( false ) );
	};

	const test = () => {
		setTesting( true );
		setError( '' );
		setNotice( '' );
		setTestResult( null );
		apiFetch( { url: TEST_URL, method: 'POST', data: {} } )
			.then( ( res ) => setTestResult( testResultLine( res ) ) )
			// A failed probe is a RESULT, not a page error: an unreachable gateway or a missing
			// driver is exactly what this button exists to discover, so it is reported on the line
			// beside the button instead of as a banner about the panel.
			.catch( ( err ) =>
				setTestResult(
					testResultLine( {
						ok: false,
						code: err && err.code ? err.code : '',
						message: friendlyError( err, __( 'The connection test did not succeed.', 'aponto' ) ),
					} )
				)
			)
			.finally( () => setTesting( false ) );
	};

	if ( loading ) {
		return (
			<div className="ap-module-panel apst">
				<Spinner />
			</div>
		);
	}

	// A server that says "not ready" REPLACES the mode banner: "Test mode" over a gateway checkout
	// will not offer describes a state the site is not in. When the server says nothing, or says
	// ready, the SWITCH's own sentence is the more useful one (D-R39b — the mode is the setting,
	// not the key prefix).
	const banner = readinessLine( status, CURRENCY ) || modeBanner( form.mode );
	// The completeness of the ACTIVE key set, which is a different question from readiness: this
	// one the panel CAN answer on its own, from the form the owner is still editing, and it stays
	// truthful between a staged clear and the save that commits it.
	const modeLine = modeStatus( form.mode, form.sets );
	// Both come from the SERVER's status block or not at all (D-R40b, Codex r2 B5). Under an
	// asset/PHP version skew there is nothing to show, and this panel says so rather than
	// reconstructing either: an endpoint derived from the browser's origin, or an event list kept
	// on this side, is one an operator would register with Stripe and trust. The one-click button
	// registers the server's own URL for the same reason — it never sends one from here.
	const endpoint = webhookEndpoint( status );
	const events = webhookEvents( status );
	const listen = endpoint ? `stripe listen --forward-to ${ endpoint }` : '';
	const local = isLocalHost( typeof window !== 'undefined' ? window.location.hostname : '' );
	const webhookUnavailable = __( 'Reload the page to load the webhook details.', 'aponto' );
	// DISABLED WHILE A REGISTRATION IS IN FLIGHT (Codex round 2, NEW-1). Both buttons write the same
	// option, and the server now serializes them — but the loser of that race gets a `503`, and the
	// one press that can produce it is a Save landing in the two seconds the button beside it is
	// talking to Stripe. Taking the press away is the honest version of the same answer: the panel
	// knows the write is busy, so it says so instead of sending a request it expects to be refused.
	const saveButton = (
		<div className="ap-module-panel__actions">
			<Button
				variant="primary"
				isBusy={ saving }
				disabled={ saving || !! registering }
				onClick={ save }
			>
				{ saving ? __( 'Saving…', 'aponto' ) : __( 'Save changes', 'aponto' ) }
			</Button>
		</div>
	);

	return (
		// `ap-module-panel` is the SHARED panel geometry every module settings screen uses
		// (admin-extra.css, owned by the free-shipped panel host); `apst` carries only what is
		// specific to this gateway.
		<div className="ap-module-panel apst">
			{ error ? (
				<Notice status="error" onRemove={ () => setError( '' ) }>
					{ error }
				</Notice>
			) : null }
			{ notice ? (
				<Notice status="success" onRemove={ () => setNotice( '' ) }>
					{ notice }
				</Notice>
			) : null }

			<Card className="ap-module-panel__section">
				<CardHeader className="ap-module-panel__section-head">
					<h2>{ __( 'How Stripe payments work here', 'aponto' ) }</h2>
				</CardHeader>
				<CardBody className="ap-module-panel__body">
					<p className="ap-module-panel__intro">
						{ __(
							'You connect your own Stripe account, so the money goes straight to you. Customers pay inside the booking form — card, and Apple Pay, Google Pay or Link wherever Stripe enables them for your account — without leaving your site. The slot is held while they pay.',
							'aponto'
						) }
					</p>
					<p className="ap-module-panel__help">
						{ __(
							'Payment methods that redirect the customer to another site or settle later (bank debits, vouchers, buy-now-pay-later) are not offered in this version.',
							'aponto'
						) }
					</p>
				</CardBody>
			</Card>

			<Card className="ap-module-panel__section">
				<CardHeader className="ap-module-panel__section-head">
					<h2>{ __( '1. Mode', 'aponto' ) }</h2>
				</CardHeader>
				<CardBody className="ap-module-panel__body">
					<p className="ap-module-panel__intro">
						{ __(
							'Both key sets are kept, so you can switch back and forth without pasting anything again. Set up in Test, try a real booking, then switch to Live when you are happy.',
							'aponto'
						) }
					</p>

					<div className="apst-modes" role="radiogroup" aria-label={ __( 'Stripe mode', 'aponto' ) }>
						{ MODES.map( ( mode ) => (
							<button
								key={ mode }
								type="button"
								role="radio"
								aria-checked={ form.mode === mode }
								className={ `apst-mode-option${ form.mode === mode ? ' is-selected' : '' } is-${ mode }` }
								onClick={ () => {
									patch( { mode } );
									setOpenSet( mode );
								} }
							>
								<span className="apst-mode-option__title">
									{ 'live' === mode ? __( 'Live mode', 'aponto' ) : __( 'Test mode', 'aponto' ) }
								</span>
								<span className="apst-mode-option__detail">
									{ 'live' === mode
										? __( 'Real charges', 'aponto' )
										: __( 'No real charges', 'aponto' ) }
								</span>
							</button>
						) ) }
					</div>

					<p className={ `apst-mode ${ banner.tone }` }>
						<strong>{ banner.title }</strong>
						<span>{ banner.detail }</span>
					</p>

					<p className="apst-status">
						<span className={ `apst-pill ${ modeLine.tone }` } aria-hidden="true" />
						<span>{ modeLine.text }</span>
					</p>
					{ fields.mode ? <p className="ap-module-panel__error">{ fields.mode }</p> : null }

					{ saveButton }
				</CardBody>
			</Card>

			{ MODES.map( ( mode, index ) => {
				const set = form.sets[ mode ];
				const isActive = form.mode === mode;
				const expanded = isActive || openSet === mode;
				const prefix = `${ mode }_`;
				const pasted = modeOfKey( set.publishableKey );

				return (
					<Card className="ap-module-panel__section" key={ mode }>
						<CardHeader className="ap-module-panel__section-head">
							<h2>
								{ 'live' === mode
									? sprintf(
											/* translators: %d: section number. */
											__( '%d. Live keys', 'aponto' ),
											index + 2
									  )
									: sprintf(
											/* translators: %d: section number. */
											__( '%d. Test keys', 'aponto' ),
											index + 2
									  ) }
							</h2>
							<span className={ `apst-pill ${ setIsComplete( set ) ? 'is-ok' : 'is-warn' }` }>
								{ setIsComplete( set ) ? __( 'Complete', 'aponto' ) : __( 'Setup needed', 'aponto' ) }
							</span>
						</CardHeader>
						<CardBody className="ap-module-panel__body">
							{ ! expanded ? (
								<div className="ap-module-panel__actions">
									<p className="ap-module-panel__help">
										{ 'live' === mode
											? __( 'Kept for when you go live. Not in use right now.', 'aponto' )
											: __( 'Kept for testing. Not in use right now.', 'aponto' ) }
									</p>
									<Button variant="secondary" onClick={ () => setOpenSet( mode ) }>
										{ __( 'Show keys', 'aponto' ) }
									</Button>
								</div>
							) : (
								<>
									<p className="ap-module-panel__intro">
										{ 'live' === mode
											? __(
													'Copy these from the Stripe Dashboard with the test-mode toggle OFF, under Developers → API keys.',
													'aponto'
											  )
											: __(
													'Copy these from the Stripe Dashboard with the test-mode toggle ON, under Developers → API keys.',
													'aponto'
											  ) }
									</p>

									<div className="ap-module-panel__field">
										<TextControl
											label={ __( 'Publishable key', 'aponto' ) }
											value={ set.publishableKey }
											autoComplete="off"
											onChange={ ( value ) => {
												clearFieldError( `${ prefix }publishable_key` );
												patchSet( mode, { publishableKey: value } );
											} }
											help={
												'live' === mode
													? __( 'Starts with pk_live_. This one is sent to the browser by design.', 'aponto' )
													: __( 'Starts with pk_test_. This one is sent to the browser by design.', 'aponto' )
											}
											__nextHasNoMarginBottom
										/>
										{ pasted && pasted !== mode ? (
											<p className="ap-module-panel__error">
												{ 'live' === mode
													? __( 'That is a TEST key. Paste it into the Test keys section instead.', 'aponto' )
													: __( 'That is a LIVE key. Paste it into the Live keys section instead.', 'aponto' ) }
											</p>
										) : null }
										{ fields[ `${ prefix }publishable_key` ] ? (
											<p className="ap-module-panel__error">{ fields[ `${ prefix }publishable_key` ] }</p>
										) : null }
									</div>

									<SecretField
										label={ __( 'Secret key', 'aponto' ) }
										help={
											'live' === mode
												? __( 'Starts with sk_live_ or rk_live_. Stored encrypted and never shown again.', 'aponto' )
												: __( 'Starts with sk_test_ or rk_test_. Stored encrypted and never shown again.', 'aponto' )
										}
										savedLabel={ __( 'Secret key saved', 'aponto' ) }
										clearLabel={ __( 'Secret key will be cleared on save', 'aponto' ) }
										keepLabel={ __( 'Keep the saved secret key', 'aponto' ) }
										isSet={ set.secretIsSet }
										mode={ set.secretMode }
										value={ set.secretValue }
										error={ fields[ `${ prefix }secret_key` ] }
										onPatch={ ( next, value ) => {
											clearFieldError( `${ prefix }secret_key` );
											patchSet( mode, { secretMode: next, secretValue: value } );
										} }
									/>

									<SecretField
										label={ __( 'Webhook signing secret', 'aponto' ) }
										help={ __(
											'Starts with whsec_. Stripe issues a DIFFERENT one for test and live — the two are not interchangeable.',
											'aponto'
										) }
										savedLabel={
											set.endpointId
												? __( 'Signing secret saved (registered automatically)', 'aponto' )
												: __( 'Signing secret saved', 'aponto' )
										}
										clearLabel={ __( 'Signing secret will be cleared on save', 'aponto' ) }
										keepLabel={ __( 'Keep the saved signing secret', 'aponto' ) }
										isSet={ set.webhookIsSet }
										mode={ set.webhookMode }
										value={ set.webhookValue }
										error={ fields[ `${ prefix }webhook_secret` ] }
										onPatch={ ( next, value ) => {
											clearFieldError( `${ prefix }webhook_secret` );
											patchSet( mode, { webhookMode: next, webhookValue: value } );
										} }
									/>

									{ set.endpointId ? (
										<p className="ap-module-panel__help">
											{ sprintf(
												/* translators: %s: Stripe webhook endpoint id. */
												__( 'Registered endpoint: %s', 'aponto' ),
												set.endpointId
											) }
										</p>
									) : null }

									{ local ? (
										<p className="ap-module-panel__help">
											{ __(
												'This site is not reachable from the internet, so Stripe cannot deliver to it. Use the Stripe CLI below while you develop, and register the endpoint from the live site.',
												'aponto'
											) }
										</p>
									) : (
										<div className="ap-module-panel__actions">
											<Button
												variant="secondary"
												isBusy={ registering === mode }
												disabled={ !! registering || ! set.secretIsSet }
												onClick={ () => registerWebhook( mode ) }
											>
												{ registering === mode
													? __( 'Registering…', 'aponto' )
													: __( 'Register webhook with Stripe', 'aponto' ) }
											</Button>
											<p className="ap-module-panel__help">
												{ set.secretIsSet
													? __(
															'Creates the endpoint in your Stripe account and saves the signing secret for you. You can also add it by hand below.',
															'aponto'
													  )
													: __( 'Save this mode’s secret key first.', 'aponto' ) }
											</p>
										</div>
									) }

									{ saveButton }
								</>
							) }
						</CardBody>
					</Card>
				);
			} ) }

			<Card className="ap-module-panel__section">
				<CardHeader className="ap-module-panel__section-head">
					<h2>{ __( '4. Webhook endpoint', 'aponto' ) }</h2>
				</CardHeader>
				<CardBody className="ap-module-panel__body">
					<p className="ap-module-panel__intro">
						{ __(
							'Add this endpoint in the Stripe Dashboard under Developers → Webhooks. Payments still complete without it, but the webhook is how a booking is finished for a customer who closes the tab mid-payment, and how refunds made in Stripe come back here.',
							'aponto'
						) }
					</p>
					<div className="ap-module-panel__field">
						<p className="ap-module-panel__label">{ __( 'Endpoint URL', 'aponto' ) }</p>
						{ endpoint ? (
							<div className="apst-uri">
								<code>{ endpoint }</code>
								<Button
									variant="secondary"
									onClick={ () => {
										copyText( endpoint ).then( ( ok ) => {
											setCopied( ok );
											if ( ok ) {
												window.setTimeout( () => setCopied( false ), 2000 );
											}
										} );
									} }
								>
									{ copied ? __( 'Copied', 'aponto' ) : __( 'Copy', 'aponto' ) }
								</Button>
							</div>
						) : (
							<p className="ap-module-panel__help apst-unknown">{ webhookUnavailable }</p>
						) }
					</div>
					<div className="ap-module-panel__field">
						<p className="ap-module-panel__label">{ __( 'Events to send', 'aponto' ) }</p>
						{ events.length ? (
							<>
								<ul className="apst-events">
									{ events.map( ( event ) => (
										<li key={ event }>
											<code>{ event }</code>
										</li>
									) ) }
								</ul>
								<p className="ap-module-panel__help">
									{ __(
										'The URL is the same in both modes, but Stripe issues a separate signing secret for each — paste it into that mode’s section above, or use the Register button there.',
										'aponto'
									) }
								</p>
							</>
						) : (
							<p className="ap-module-panel__help apst-unknown">{ webhookUnavailable }</p>
						) }
					</div>
					<details className="apst-details">
						<summary>{ __( 'Testing on a local site', 'aponto' ) }</summary>
						<div className="ap-module-panel__field">
							<p className="ap-module-panel__help">
								{ __(
									'Stripe cannot reach a site that is not on the public internet. Forward the events with the Stripe CLI instead — it prints its own signing secret, which is the one to paste above while you test.',
									'aponto'
								) }
							</p>
							{ listen ? (
								<pre className="apst-pre">{ listen }</pre>
							) : (
								<p className="ap-module-panel__help apst-unknown">
									{ webhookUnavailable }
								</p>
							) }
						</div>
					</details>
				</CardBody>
			</Card>

			<Card className="ap-module-panel__section">
				<CardHeader className="ap-module-panel__section-head">
					<h2>{ __( '5. Test the connection', 'aponto' ) }</h2>
				</CardHeader>
				<CardBody className="ap-module-panel__body">
					<p className="ap-module-panel__intro">
						{ __( 'Asks Stripe for your account details with the ACTIVE mode’s saved secret key. Nothing is charged.', 'aponto' ) }
					</p>
					<div className="ap-module-panel__actions">
						<Button variant="secondary" isBusy={ testing } disabled={ testing } onClick={ test }>
							{ testing ? __( 'Testing…', 'aponto' ) : __( 'Test connection', 'aponto' ) }
						</Button>
					</div>
					{ testResult ? (
						<p className="apst-result">
							<span className={ `apst-pill ${ testResult.tone }` } aria-hidden="true" />
							<span>{ testResult.message }</span>
						</p>
					) : null }
				</CardBody>
			</Card>

			<Card className="ap-module-panel__section">
				<CardHeader className="ap-module-panel__section-head">
					<h2>{ __( '6. Options', 'aponto' ) }</h2>
				</CardHeader>
				<CardBody className="ap-module-panel__body">
					<CheckboxControl
						label={ __( 'Send Stripe’s email receipt', 'aponto' ) }
						help={ __(
							'Stripe emails its own payment receipt to the customer, in addition to your Aponto booking confirmation.',
							'aponto'
						) }
						checked={ form.sendReceipt }
						onChange={ ( value ) => patch( { sendReceipt: value } ) }
						__nextHasNoMarginBottom
					/>
					<div className="ap-module-panel__field">
						<TextControl
							label={ __( 'Statement descriptor suffix', 'aponto' ) }
							value={ form.descriptorSuffix }
							maxLength={ DESCRIPTOR_MAX }
							autoComplete="off"
							onChange={ ( value ) => {
								clearFieldError( 'statement_descriptor_suffix' );
								patch( { descriptorSuffix: value } );
							} }
							help={ sprintf(
								/* translators: %d: maximum number of characters. */
								__(
									'Appears after your Stripe account name on the customer’s card statement, so they recognise the charge. Up to %d characters; letters, numbers and spaces.',
									'aponto'
								),
								DESCRIPTOR_MAX
							) }
							__nextHasNoMarginBottom
						/>
						{ fields.statement_descriptor_suffix ? (
							<p className="ap-module-panel__error">{ fields.statement_descriptor_suffix }</p>
						) : null }
					</div>
					{ /* The SAME action as the one closing the keys card: `PUT` is a full replacement
					     (rest-contract §2.12), so either button writes the whole form. Two placements
					     rather than two scopes — the panel is tall enough that a single save at one
					     end is a scroll away from half the fields it commits. */ }
					{ saveButton }
				</CardBody>
			</Card>

			<p className="ap-module-panel__help">
				{ __(
					'Payment requirement, hold duration and auto-confirm live in Settings → Booking → Payments — they apply to every payment method, not just Stripe.',
					'aponto'
				) }{ ' ' }
				<a href="#settings/booking/payments">{ __( 'Open payment settings', 'aponto' ) }</a>
			</p>
		</div>
	);
}

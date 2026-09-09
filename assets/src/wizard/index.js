/**
 * Aponto onboarding wizard (SPEC-P1 §4) — React + @wordpress/components.
 *
 * A self-contained detect-and-confirm wizard: Welcome → Confirm business info →
 * Business hours → Staff → First service → Done. Every step can be skipped; the
 * flow can be re-entered later. Each step persists through ONE nonce-guarded
 * admin-ajax action (`aponto_wizard`) that delegates to the PHP WizardService — no
 * new REST route. The bootstrap payload (`window.apontoWizard`) carries the ajax
 * URL + nonce, the current funnel/prefill state, the timezone list and localized
 * weekday labels.
 *
 * The screen is a FULL-SCREEN takeover (the surrounding wp-admin menu, admin bar, footer and
 * notices are suppressed on this screen only — `WizardPage.php`): `Chrome.jsx` renders the
 * full-width header (brand · six-step progress · exit) and the step card is centered on both axes
 * in what is left. That chrome is built on the `aponto-wizard` class hooks this app already
 * carried for it, and it is styling only — every step, request and transition below is unchanged.
 *
 * The style stack loads with this entry (wizard.css + the shared `--ap-*` tokens) and only on this
 * screen, so the wizard reads as the same product as the admin SPA.
 */
// Design tokens first, then the wizard's own chrome. The token sheet is the product's single
// source for color/space/type roles (`--ap-*`); it is imported from the admin style folder rather
// than copied so the wizard can never drift from the SPA's palette.
import '../admin/styles/aponto-tokens.css';
import './wizard.css';
import { createRoot, useState, useMemo, useRef, useEffect } from '@wordpress/element';
import {
	Button,
	TextControl,
	TextareaControl,
	SelectControl,
	ToggleControl,
	Notice,
	Spinner,
	Flex,
	FlexItem,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { wizardPost } from './api.js';
import { StepShell } from './ui.jsx';
import { DoneStep, dashboardUrl } from './DoneStep.jsx';
import { STEPS, WizardHeader } from './Chrome.jsx';

const BOOT =
	( typeof window !== 'undefined' && window.apontoWizard ) || {
		ajaxUrl: '',
		action: 'aponto_wizard',
		nonce: '',
		adminUrl: '',
		state: {},
		timezones: [],
		currencies: [],
		weekdays: {},
		weekStart: 1,
		multiStaff: false,
	};

/**
 * Whether this site already has unlimited staff (D-R28). Copy-only: it chooses between "you can
 * add the rest of your team" and the upsell line on the Staff step. Defaults to false, so a boot
 * payload older than this bundle keeps today's wording rather than promising a capability.
 */
const MULTI_STAFF = true === BOOT.multiStaff;

/**
 * POST one wizard step to admin-ajax; resolves the parsed `data` payload and THROWS on every
 * failure — including a response that never arrives, which used to spin the Saving button forever
 * (beta report 2026-07-25). The request contract lives in `./api.js` so it can be unit-tested.
 */
function apiPost( doAction, payload ) {
	return wizardPost( BOOT, doAction, payload );
}

/**
 * Client-side email shape — the SAME rule the booking form applies to the customer's address
 * (`assets/src/form/app.jsx`). It is a typo guard, not an authority: the server re-checks with
 * WordPress's `is_email()` and refuses the step on its own (SPEC-P1 §4 step 4, QA B).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The `varchar(191)` width every name/email column in the schema uses, mirrored from
 * `Aponto\Rest\Args::MAX_191` (and `WizardService::MAX_NAME`) so the client refuses what the
 * server refuses instead of letting the database truncate.
 */
const MAX_FIELD = 191;

/** minutes → a clock label in the site's time format: `9:00 AM` (12h) or `09:00` (24h) — C7. */
function toClock( minutes, timeFormat ) {
	const h24 = Math.floor( minutes / 60 );
	const m = minutes % 60;
	const pad = ( n ) => ( n < 10 ? '0' + n : '' + n );
	if ( /a/i.test( String( timeFormat || '' ) ) ) {
		// h24===24 is the 1440 end-of-day option → 12:00 AM (next midnight).
		const ap = h24 < 12 || h24 === 24 ? 'AM' : 'PM';
		const h12 = h24 % 12 || 12;
		return h12 + ':' + pad( m ) + ' ' + ap;
	}
	return pad( h24 ) + ':' + pad( m );
}

/** Build the 30-minute step-time menu, labelled in the site's format (C7). */
function buildTimeOptions( timeFormat ) {
	const out = [];
	for ( let m = 0; m <= 1440; m += 30 ) {
		out.push( { label: toClock( m, timeFormat ), value: String( m ) } );
	}
	return out;
}

/** ISO weekdays 1..7 ordered from the site's week-start setting (0=Sun..6=Sat). */
function orderedWeekdays( weekStart ) {
	// Map the 0=Sun..6=Sat start into ISO 1..7 (Mon..Sun) order.
	const isoOrder = [ 1, 2, 3, 4, 5, 6, 7 ];
	const startIso = weekStart === 0 ? 7 : weekStart; // Sunday(0) → ISO 7.
	const idx = isoOrder.indexOf( startIso );
	return isoOrder.slice( idx ).concat( isoOrder.slice( 0, idx ) );
}

export function Wizard() {
	const prefill = ( BOOT.state && BOOT.state.prefill ) || {};
	// Resume where the founder left off (C10 — finding U4: reopening dropped you back at Welcome even
	// though the data was kept). Clamped into the STEP RANGE, 0..last: 0 (never saved / after "Start
	// over") lands on Welcome, and the LAST step is a legitimate destination — after a completed run
	// the stored cursor is `STEPS.length - 1` (`done`), the step that owns "Create booking page",
	// which is exactly what the dashboard's "Create your booking page" card links to with `reopen=1`.
	// The old bound (`STEPS.length - 2`) clamped that cursor down to `service` and dropped the
	// founder into an empty "Add your first service" form, three Skips away from the action they
	// asked for (beta report 2026-08-01, QA C).
	const [ index, setIndex ] = useState( () => {
		const resume = Number( BOOT.state && BOOT.state.resumeStep );
		if ( ! Number.isFinite( resume ) ) {
			return 0;
		}
		return Math.min( Math.max( resume, 0 ), STEPS.length - 1 );
	} );
	const [ saving, setSaving ] = useState( false );
	const [ error, setError ] = useState( '' );
	// Per-field messages the SERVER refused the step with (`data.fields` — SPEC-P1 §4). The client
	// blocks the same mistakes before posting, so this only fills in when a request slipped past it
	// (a stale bundle, a non-UI caller); it is rendered by the same inline element either way.
	const [ fieldErrors, setFieldErrors ] = useState( {} );
	// '' while the wizard is running; 'skipped' / 'finished' name HOW it ended. Only reachable when
	// the bootstrap carries no `adminUrl` to redirect into — the in-place confirmation screen.
	const [ done, setDone ] = useState( '' );
	const [ page, setPage ] = useState(
		( BOOT.state && BOOT.state.bookingPage ) || null
	);

	// Step form state (prefilled).
	const [ business, setBusiness ] = useState( {
		name:
			( prefill.business && prefill.business.name ) ||
			prefill.siteTitle ||
			'',
		address: ( prefill.business && prefill.business.address ) || '',
		phone: ( prefill.business && prefill.business.phone ) || '',
		timezone: prefill.timezone || 'UTC',
		currency: prefill.currency || 'USD',
	} );

	const [ hours, setHours ] = useState( () => {
		const map = {};
		for ( let iso = 1; iso <= 7; iso++ ) {
			map[ iso ] = { open: iso <= 5, start: 540, end: 1020 };
		}
		return map;
	} );

	const [ staff, setStaff ] = useState( {
		name: ( prefill.currentUser && prefill.currentUser.name ) || '',
		email: ( prefill.currentUser && prefill.currentUser.email ) || '',
	} );

	const [ service, setService ] = useState( {
		name: '',
		duration: 60,
		price: '',
	} );

	// Timezone menu from the IANA list; keep the prefilled value selectable even when it is not in
	// it — the same rule the currency menu below uses. A site that never picked a city prefills a
	// raw UTC OFFSET (`+07:00`), which is not an IANA identifier, and a `<select>` whose value
	// matches no option silently displays its FIRST one (Africa/Abidjan) — the wizard would then
	// name a country the business is not in. Offset 0 is normalized to `UTC` server-side
	// (WizardService::prefillTimezone); any other offset stays visible AS the offset, so the owner
	// sees what their site actually has and picks a city on purpose.
	const tzOptions = useMemo( () => {
		const zones = BOOT.timezones || [];
		const selected = prefill.timezone || '';
		const list =
			selected && ! zones.includes( selected ) ? [ selected, ...zones ] : zones;
		return list.map( ( z ) => ( {
			label: /^[+-]/.test( z ) ? `UTC${ z }` : z,
			value: z,
		} ) );
	}, [] );

	// Currency menu from the neutral global list; keep the prefilled code selectable even if it is
	// not in the curated list (the store accepts any valid 3-letter code).
	const currencyOptions = useMemo( () => {
		const codes = BOOT.currencies || [];
		const selected = prefill.currency || '';
		const list =
			selected && ! codes.includes( selected )
				? [ selected, ...codes ]
				: codes;
		return list.map( ( c ) => ( { label: c, value: c } ) );
	}, [] );

	const dayOrder = useMemo(
		() => orderedWeekdays( Number( BOOT.weekStart ) || 1 ),
		[]
	);

	/** Localized weekday name for an ISO day, falling back to the number. */
	function weekdayName( iso ) {
		return ( BOOT.weekdays && BOOT.weekdays[ iso ] ) || String( iso );
	}

	// C8 — "Apply <day>'s hours to all open days", the affordance the admin SPA's WeeklyHoursGrid
	// already carries (assets/src/admin/lib/WeeklyHoursGrid.jsx). Identical semantics: the FIRST open
	// day in the displayed order is the template, and only OPEN days are rewritten — a closed day
	// stays closed. Hidden below two open days, where the action would be a no-op.
	const openDays = dayOrder.filter( ( iso ) => hours[ iso ] && hours[ iso ].open );

	/**
	 * Write the weekly grid and drop the server's per-day messages: they described the values that
	 * were just replaced, and a stale error under a day the founder has already fixed is noise.
	 *
	 * @param {Object} next The full weekday → `{open, start, end}` map to store.
	 */
	function updateHours( next ) {
		setHours( next );
		setFieldErrors( {} );
	}

	const applyToAllOpen = () => {
		if ( openDays.length < 2 ) {
			return;
		}
		const template = hours[ openDays[ 0 ] ];
		const next = { ...hours };
		openDays.forEach( ( iso ) => {
			next[ iso ] = {
				...next[ iso ],
				start: template.start,
				end: template.end,
			};
		} );
		updateHours( next );
	};

	// QA A (beta report 2026-08-01) — an OPEN day whose end is not after its start (Monday
	// 17:00–09:00, the am/pm slip) was posted as-is and then dropped server-side, so the day came
	// back "Closed" with nothing on screen to explain it. The range is checked here, the offending
	// day carries an inline error, and the step's commit is held disabled while any day is invalid —
	// the same "a commit action looks disabled when it is" rule the staff and service steps follow.
	const hourErrors = useMemo( () => {
		const errors = {};
		Object.keys( hours ).forEach( ( iso ) => {
			const day = hours[ iso ];
			if ( day && day.open && Number( day.end ) <= Number( day.start ) ) {
				errors[ iso ] = __(
					'The end time must be after the start time.',
					'aponto'
				);
			}
		} );

		return errors;
	}, [ hours ] );
	const hasHourErrors = Object.keys( hourErrors ).length > 0;

	// A staff row with no name is never legitimate — the calendar, the booking form and every
	// notification call the provider by it — so the step cannot commit without one. The DISABLED
	// Continue button used to be the ONLY sign of that, with nothing on the field to say why
	// (beta report 2026-08-02); the server refuses the same value with the same message now, and
	// skipping the step still posts nothing at all rather than posting a blank.
	const staffNameError = useMemo( () => {
		const name = ( staff.name || '' ).trim();
		if ( '' === name ) {
			return __( 'A name is required.', 'aponto' );
		}
		if ( name.length > MAX_FIELD ) {
			return __( 'This name is too long.', 'aponto' );
		}

		return '';
	}, [ staff.name ] );

	// QA B — a staff email is where every booking notification for this staff member lands, so a
	// typo is lost mail. Blank stays allowed (the field is optional and the whole step is skippable);
	// anything else must look like an address before the step can commit. The server re-checks with
	// `is_email()` and refuses the step on its own.
	const staffEmailError = useMemo( () => {
		const email = ( staff.email || '' ).trim();
		if ( '' === email || EMAIL_RE.test( email ) ) {
			return '';
		}

		return __( 'Enter a valid email address, or leave it blank.', 'aponto' );
	}, [ staff.email ] );

	// Hours menu labelled in the site time format — 12h am/pm for a US site (C7, finding U1).
	const timeOptions = useMemo( () => buildTimeOptions( prefill.timeFormat ), [ prefill.timeFormat ] );

	// Move focus to the new step's heading whenever the step changes. Each step replaces the whole
	// card, so the button that was focused ("Continue") is gone from the DOM: without this, focus
	// falls back to <body> and a keyboard or screen-reader user is silently dropped at the top of
	// the document with no announcement of where they landed. The FIRST render is deliberately
	// skipped — stealing focus on page load announces the heading over the user's own navigation
	// and scrolls the viewport for no reason.
	const headingRef = useRef( null );
	const stepMounted = useRef( false );
	useEffect( () => {
		if ( ! stepMounted.current ) {
			stepMounted.current = true;
			return;
		}
		if ( headingRef.current ) {
			headingRef.current.focus();
		}
	}, [ index, done ] );

	// Persist the resume cursor (C10). Best-effort — a failed cursor write must never block or slow
	// navigation, so it is fire-and-forget.
	function persistStep( next ) {
		apiPost( 'step', { step: next } ).catch( () => {} );
	}

	function go( next ) {
		setError( '' );
		setFieldErrors( {} );
		setIndex( next );
		persistStep( next );
	}

	function startOver() {
		setError( '' );
		setFieldErrors( {} );
		setIndex( 0 );
		persistStep( 0 );
	}

	async function save( doAction, payload, next ) {
		setSaving( true );
		setError( '' );
		setFieldErrors( {} );
		try {
			await apiPost( doAction, payload );
			if ( typeof next === 'number' ) {
				setIndex( next );
				persistStep( next );
			}
		} catch ( e ) {
			setError( e.message );
			// A refused step names its fields (SPEC-P1 §4); every other failure carries none, and
			// the notice alone is the right report for those.
			setFieldErrors( e && e.fields ? e.fields : {} );
		} finally {
			setSaving( false );
		}
	}

	async function skipWizard() {
		setSaving( true );
		setError( '' );
		try {
			// C12: the SERVER's skip action auto-creates the owner-staff when (and only when) no
			// staff exists and the current user has a usable email — never overwriting an existing
			// row (review F item 2). The client just skips.
			await apiPost( 'skip', {} );
			// Skip stamps the funnel `skipped` flag server-side, which releases the full
			// Aponto menu. Redirect straight into the app so "I'll do it myself" lands on
			// the dashboard in the SAME session instead of a dead-end screen (U4-01).
			if ( BOOT.adminUrl ) {
				window.location.assign( BOOT.adminUrl );
				return;
			}
			// Fallback (no adminUrl injected): show the done screen with its CTA.
			setDone( 'skipped' );
		} catch ( e ) {
			setError( e.message );
		} finally {
			setSaving( false );
		}
	}

	/**
	 * Step 6 — create (or publish) the booking page. Fails LOUDLY when the server answered without a
	 * page DTO: leaving `page` null would silently redraw the same "Create booking page" button, the
	 * exact dead-button symptom this step was reported for.
	 */
	async function createPage() {
		setSaving( true );
		setError( '' );
		try {
			const data = await apiPost( 'page', {} );
			if ( ! data || ! data.page ) {
				throw new Error(
					__(
						'The booking page could not be created. Please try again.',
						'aponto'
					)
				);
			}
			setPage( data.page );
		} catch ( e ) {
			setError( e.message );
		} finally {
			setSaving( false );
		}
	}

	/**
	 * Step 6 — "Finish setup": stamp `wizard_completed` server-side (which releases the full Aponto
	 * menu even when no service was created) and land in the app's dashboard IN THE SAME session,
	 * the same "never end on a dead-end screen" rule the skip path follows (U4-01). The resume
	 * cursor is deliberately left alone so a later re-entry from Settings still resumes (C10).
	 */
	async function finishSetup() {
		setSaving( true );
		setError( '' );
		try {
			await apiPost( 'finish', {} );
			const target = dashboardUrl( BOOT.adminUrl );
			if ( '' !== target ) {
				window.location.assign( target );
				return;
			}
			setDone( 'finished' );
		} catch ( e ) {
			setError( e.message );
		} finally {
			setSaving( false );
		}
	}

	function busyLabel( label ) {
		return saving ? (
			<>
				<Spinner /> { __( 'Saving…', 'aponto' ) }
			</>
		) : (
			label
		);
	}

	// The page shell is the same in every branch — full-width header, then the step card centered
	// in what is left — so the chrome never shifts between steps (DESIGN-SYSTEM.md: "the app
	// header must not change when the route content changes"). It is written out per branch rather
	// than wrapped in a locally-defined component, which React would treat as a NEW component type
	// on every render and remount the whole step (losing focus and every field's state).
	if ( done ) {
		return (
			<>
				<WizardHeader
					index={ STEPS.length - 1 }
					onExit={ null }
					exitBusy={ saving }
				/>
				<main className="aponto-wizard-main">
					<div className="aponto-wizard-content">
						<StepShell
							headingRef={ headingRef }
							title={ __( 'You’re all set', 'aponto' ) }
							subtitle={ __(
								'You can reopen this setup anytime from Settings → Open setup wizard.',
								'aponto'
							) }
							footer={
								BOOT.adminUrl ? (
									<Flex className="aponto-wizard-actions-end" justify="flex-end">
										<FlexItem>
											<Button
												variant="primary"
												href={ BOOT.adminUrl }
											>
												{ __(
													'Go to dashboard',
													'aponto'
												) }
											</Button>
										</FlexItem>
									</Flex>
								) : null
							}
						>
							<p>
								{ 'finished' === done
									? __(
											'Setup is complete. Aponto is ready in the main menu.',
											'aponto'
									  )
									: __(
											'Setup was skipped. Add a service and a booking page whenever you’re ready.',
											'aponto'
									  ) }
							</p>
						</StepShell>
					</div>
				</main>
			</>
		);
	}

	const step = STEPS[ index ];

	return (
		<>
			{ /* "Exit setup" is the header's door onto the EXISTING skip flow — the same handler
			     the Welcome step's "I'll do it myself" calls, which stamps the funnel and
			     auto-creates the owner-staff server-side (C12). No new semantics. */ }
			<WizardHeader
				index={ index }
				onExit={ skipWizard }
				exitBusy={ saving }
			/>
			<main className="aponto-wizard-main">
				<div className="aponto-wizard-content">
					{ /* The toolbar is rendered only when it HAS content. An always-present empty
					     row still reserved its control height + margin on Welcome and Done, which
					     pushed the card off optical center on exactly those two steps (QA V3). */ }
					{ index > 0 && step !== 'done' ? (
						<div className="aponto-wizard-toolbar">
							<Button variant="tertiary" disabled={ saving } onClick={ startOver }>
								{ __( 'Start over', 'aponto' ) }
							</Button>
						</div>
					) : null }
					{ error && (
						<Notice
							status="error"
							isDismissible
							onRemove={ () => setError( '' ) }
						>
							{ error }
						</Notice>
					) }

					{ step === 'welcome' && (
						<StepShell
							headingRef={ headingRef }
							// A title, a subtitle and one sentence do not need three ruled
							// sections. `is-plain` drops the card's internal rules so Welcome
							// reads as ONE panel (QA V10) — same copy, same components.
							variant="is-plain"
							title={ __( 'Welcome to Aponto', 'aponto' ) }
							subtitle={ __(
								'Want a hand getting set up? It takes about three minutes.',
								'aponto'
							) }
							footer={
								<Flex
									className="aponto-wizard-actions"
									justify="flex-end"
								>
									<FlexItem>
										<Button
											variant="tertiary"
											disabled={ saving }
											onClick={ skipWizard }
										>
											{ __( 'I’ll do it myself', 'aponto' ) }
										</Button>
									</FlexItem>
									<FlexItem>
										<Button
											variant="primary"
											onClick={ () => go( 1 ) }
										>
											{ __( 'Yes, guide me', 'aponto' ) }
										</Button>
									</FlexItem>
								</Flex>
							}
						>
							<p>
								{ __(
									'We’ll confirm your business details, set your hours, add you as staff, and create your first service and booking page.',
									'aponto'
								) }
							</p>
						</StepShell>
					) }

					{ step === 'business' && (
						<StepShell
							headingRef={ headingRef }
							title={ __( 'Confirm your business info', 'aponto' ) }
							subtitle={ __(
								'We prefilled this from WordPress — fix anything that’s off.',
								'aponto'
							) }
							footer={
								<Flex className="aponto-wizard-actions" justify="space-between">
									<FlexItem>
										<Button
											variant="tertiary"
											onClick={ () => go( 0 ) }
										>
											{ __( 'Back', 'aponto' ) }
										</Button>
									</FlexItem>
									<Flex className="aponto-wizard-actions-end" justify="flex-end">
										<FlexItem>
											<Button
												variant="tertiary"
												onClick={ () => go( 2 ) }
											>
												{ __( 'Skip', 'aponto' ) }
											</Button>
										</FlexItem>
										<FlexItem>
											<Button
												variant="primary"
												disabled={ saving }
												onClick={ () =>
													save(
														'business',
														{
															name: business.name,
															address: business.address,
															phone: business.phone,
															timezone: business.timezone,
															currency:
																business.currency,
															dateFormat:
																prefill.dateFormat,
															timeFormat:
																prefill.timeFormat,
															weekStart:
																prefill.weekStart,
														},
														2
													)
												}
											>
												{ busyLabel( __( 'Continue', 'aponto' ) ) }
											</Button>
										</FlexItem>
									</Flex>
								</Flex>
							}
						>
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Business name', 'aponto' ) }
								value={ business.name }
								onChange={ ( v ) =>
									setBusiness( { ...business, name: v } )
								}
								__nextHasNoMarginBottom
							/>
							{ /* A TEXTAREA, like Settings.
							     `business.address` is declared with the textarea control in
							     src/Support/Settings.php and reaches the settings screen through that
							     app's textarea field type (rows=3). A single-line TextControl here gave
							     the SAME setting two different affordances depending on which screen the
							     owner opened, and quietly discouraged the multi-line address that
							     confirmation emails and the .ics file both expect. Label, help and
							     msgids are unchanged. */ }
							<TextareaControl
								rows={ 3 }
								label={ __( 'Address', 'aponto' ) }
								help={ __(
									'Used in confirmation emails and the calendar file. Leave blank if you’re online-only.',
									'aponto'
								) }
								value={ business.address }
								onChange={ ( v ) =>
									setBusiness( { ...business, address: v } )
								}
								__nextHasNoMarginBottom
							/>
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Phone', 'aponto' ) }
								value={ business.phone }
								onChange={ ( v ) =>
									setBusiness( { ...business, phone: v } )
								}
								__nextHasNoMarginBottom
							/>
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Timezone', 'aponto' ) }
								help={ __(
									'Bookings are shown to each visitor in their own timezone; this is your studio’s.',
									'aponto'
								) }
								value={ business.timezone }
								options={ tzOptions }
								onChange={ ( v ) =>
									setBusiness( { ...business, timezone: v } )
								}
								__nextHasNoMarginBottom
							/>
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Currency', 'aponto' ) }
								help={ __(
									'Used for service prices and order totals. You can change it later in Settings.',
									'aponto'
								) }
								value={ business.currency }
								options={ currencyOptions }
								onChange={ ( v ) =>
									setBusiness( { ...business, currency: v } )
								}
								__nextHasNoMarginBottom
							/>
							<p className="aponto-wizard-muted aponto-wizard-formats">
								{ sprintf(
									/* translators: 1: date format, 2: time format. */
									__(
										'Date and time formats (%1$s, %2$s) and week start are confirmed from WordPress.',
										'aponto'
									),
									prefill.dateFormat || '',
									prefill.timeFormat || ''
								) }
							</p>
						</StepShell>
					) }

					{ step === 'hours' && (
						<StepShell
							headingRef={ headingRef }
							title={ __( 'Set your business hours', 'aponto' ) }
							subtitle={ __(
								'Staff inherit these hours. You can fine-tune later.',
								'aponto'
							) }
							footer={
								<Flex className="aponto-wizard-actions" justify="space-between">
									<FlexItem>
										<Button
											variant="tertiary"
											onClick={ () => go( 1 ) }
										>
											{ __( 'Back', 'aponto' ) }
										</Button>
									</FlexItem>
									<Flex className="aponto-wizard-actions-end" justify="flex-end">
										<FlexItem>
											<Button
												variant="tertiary"
												onClick={ () => go( 3 ) }
											>
												{ __( 'Skip', 'aponto' ) }
											</Button>
										</FlexItem>
										<FlexItem>
											<Button
												variant="primary"
												disabled={ saving || hasHourErrors }
												onClick={ () =>
													save(
														'hours',
														{
															days: Object.keys(
																hours
															).map( ( iso ) => ( {
																weekday: Number( iso ),
																open: hours[ iso ].open,
																start: hours[ iso ]
																	.start,
																end: hours[ iso ].end,
															} ) ),
														},
														3
													)
												}
											>
												{ busyLabel( __( 'Continue', 'aponto' ) ) }
											</Button>
										</FlexItem>
									</Flex>
								</Flex>
							}
							// One repeated compact row per weekday: the tighter 8px row rhythm
							// instead of the 16px field-group gap.
							gap={ 2 }
						>
							{ /* C8 — the same "apply the first open day's hours everywhere"
							     shortcut the admin SPA's WeeklyHoursGrid puts ABOVE its grid.
							     Same position, same wording, same semantics. */ }
							{ openDays.length >= 2 && (
								<div className="aponto-wizard-hours-toolbar">
									<Button
										className="aponto-wizard-hours-apply"
										variant="tertiary"
										onClick={ applyToAllOpen }
									>
										{ sprintf(
											/* translators: %s: weekday name, e.g. Monday. */
											__(
												'Apply %s’s hours to all open days',
												'aponto'
											),
											weekdayName( openDays[ 0 ] )
										) }
									</Button>
								</div>
							) }
							{ dayOrder.map( ( iso ) => {
								const day = hours[ iso ];
								const dayName = weekdayName( iso );
								// The client's own check first; the server's message for this day
								// (`data.fields[ weekday ]`) is the fallback for anything that
								// reached it anyway.
								const dayError =
									hourErrors[ iso ] || fieldErrors[ iso ] || '';
								return (
									/* Day at the row START, times at the row END: the grid then
									   uses the card's full width instead of ending a third of the
									   way in (QA V6). The row keeps a control-height floor so a
									   CLOSED day does not collapse tighter than an open one
									   (QA V7). Plain elements rather than Flex/FlexItem so the
									   rhythm is owned by one CSS rule. The wrapper exists so an
									   invalid range can put its message UNDER its own row instead
									   of at the bottom of the card (QA A). */
									<div
										className="aponto-wizard-hours-item"
										key={ iso }
									>
										<div
											className={
												'aponto-wizard-hours-row' +
												( day.open ? '' : ' is-closed' )
											}
										>
											<div className="aponto-wizard-hours-day">
												<ToggleControl
													label={ dayName }
													// Accessible name so screen-reader/keyboard users can tell
													// which day each switch controls (fleet-r1 Fix 9e; finding
													// U1 BUG-2 — the day label was an unassociated sibling).
													aria-label={ sprintf(
														/* translators: %s: weekday name. */
														__( 'Open on %s', 'aponto' ),
														dayName
													) }
													checked={ day.open }
													onChange={ ( open ) =>
														updateHours( {
															...hours,
															[ iso ]: { ...day, open },
														} )
													}
													__nextHasNoMarginBottom
												/>
											</div>
											<div className="aponto-wizard-hours-times">
												{ day.open ? (
													<>
														<div className="aponto-wizard-hours-time">
															<SelectControl
																__next40pxDefaultSize
																value={ String( day.start ) }
																options={ timeOptions }
																onChange={ ( v ) =>
																	updateHours( {
																		...hours,
																		[ iso ]: {
																			...day,
																			start: Number( v ),
																		},
																	} )
																}
																__nextHasNoMarginBottom
															/>
														</div>
														<span
															className="aponto-wizard-hours-sep"
															aria-hidden="true"
														>
															–
														</span>
														<div className="aponto-wizard-hours-time">
															<SelectControl
																__next40pxDefaultSize
																value={ String( day.end ) }
																options={ timeOptions }
																onChange={ ( v ) =>
																	updateHours( {
																		...hours,
																		[ iso ]: {
																			...day,
																			end: Number( v ),
																		},
																	} )
																}
																__nextHasNoMarginBottom
															/>
														</div>
													</>
												) : (
													<span className="aponto-wizard-muted">
														{ __( 'Closed', 'aponto' ) }
													</span>
												) }
											</div>
										</div>
										{ '' !== dayError && (
											<p
												className="aponto-wizard-field-error"
												data-weekday={ iso }
											>
												{ dayError }
											</p>
										) }
									</div>
								);
							} ) }
						</StepShell>
					) }

					{ step === 'staff' && (
						<StepShell
							headingRef={ headingRef }
							title={ __( 'Who takes the bookings?', 'aponto' ) }
							subtitle={
								MULTI_STAFF
									? __(
											'We prefilled you. You can add the rest of your team from the Staff screen.',
											'aponto'
									  )
									: __(
											'We prefilled you. Add more staff later with Premium.',
											'aponto'
									  )
							}
							footer={
								<Flex className="aponto-wizard-actions" justify="space-between">
									<FlexItem>
										<Button
											variant="tertiary"
											onClick={ () => go( 2 ) }
										>
											{ __( 'Back', 'aponto' ) }
										</Button>
									</FlexItem>
									<Flex className="aponto-wizard-actions-end" justify="flex-end">
										<FlexItem>
											<Button
												variant="tertiary"
												onClick={ () => go( 4 ) }
											>
												{ __( 'Skip', 'aponto' ) }
											</Button>
										</FlexItem>
										<FlexItem>
											<Button
												variant="primary"
												disabled={
													saving ||
													'' !== staffNameError ||
													'' !== staffEmailError
												}
												onClick={ () =>
													save(
														'staff',
														{
															name: staff.name,
															email: staff.email,
														},
														4
													)
												}
											>
												{ busyLabel( __( 'Continue', 'aponto' ) ) }
											</Button>
										</FlexItem>
									</Flex>
								</Flex>
							}
						>
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Name', 'aponto' ) }
								value={ staff.name }
								onChange={ ( v ) => {
									setStaff( { ...staff, name: v } );
									// The server's verdict described the value that was just
									// replaced — drop it as soon as the founder edits the field.
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ '' !== ( staffNameError || fieldErrors.name || '' ) && (
								<p className="aponto-wizard-field-error">
									{ staffNameError || fieldErrors.name }
								</p>
							) }
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Email', 'aponto' ) }
								type="email"
								value={ staff.email }
								onChange={ ( v ) => {
									setStaff( { ...staff, email: v } );
									// The server's message described the address that was just
									// replaced — drop it as soon as the founder edits the field.
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ '' !== ( staffEmailError || fieldErrors.email || '' ) && (
								<p className="aponto-wizard-field-error">
									{ staffEmailError || fieldErrors.email }
								</p>
							) }
						</StepShell>
					) }

					{ step === 'service' && (
						<StepShell
							headingRef={ headingRef }
							title={ __( 'Add your first service', 'aponto' ) }
							subtitle={ __(
								'What can people book? You can add more later.',
								'aponto'
							) }
							footer={
								<Flex className="aponto-wizard-actions" justify="space-between">
									<FlexItem>
										<Button
											variant="tertiary"
											onClick={ () => go( 3 ) }
										>
											{ __( 'Back', 'aponto' ) }
										</Button>
									</FlexItem>
									<Flex className="aponto-wizard-actions-end" justify="flex-end">
										<FlexItem>
											<Button
												variant="tertiary"
												onClick={ () => go( 5 ) }
											>
												{ __( 'Skip', 'aponto' ) }
											</Button>
										</FlexItem>
										<FlexItem>
											<Button
												variant="primary"
												disabled={ saving || ! service.name }
												onClick={ () =>
													save(
														'service',
														{
															name: service.name,
															duration: service.duration,
															price: service.price,
														},
														5
													)
												}
											>
												{ busyLabel(
													__( 'Create service', 'aponto' )
												) }
											</Button>
										</FlexItem>
									</Flex>
								</Flex>
							}
						>
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Service name', 'aponto' ) }
								placeholder={ __( 'e.g. Haircut', 'aponto' ) }
								value={ service.name }
								onChange={ ( v ) =>
									setService( { ...service, name: v } )
								}
								__nextHasNoMarginBottom
							/>
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Duration', 'aponto' ) }
								value={ String( service.duration ) }
								options={ [ 15, 30, 45, 60, 90, 120 ].map( ( d ) => ( {
									label: sprintf(
										/* translators: %d: minutes. */
										__( '%d minutes', 'aponto' ),
										d
									),
									value: String( d ),
								} ) ) }
								onChange={ ( v ) =>
									setService( { ...service, duration: Number( v ) } )
								}
								__nextHasNoMarginBottom
							/>
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Price (optional)', 'aponto' ) }
								type="number"
								value={ service.price }
								onChange={ ( v ) =>
									setService( { ...service, price: v } )
								}
								__nextHasNoMarginBottom
							/>
						</StepShell>
					) }

					{ step === 'done' && (
						<DoneStep
							headingRef={ headingRef }
							page={ page }
							saving={ saving }
							busyLabel={ busyLabel }
							onBack={ () => go( 4 ) }
							onCreatePage={ createPage }
							onFinish={ finishSetup }
						/>
					) }
				</div>
			</main>
		</>
	);
}

const root = document.getElementById( 'aponto-wizard-root' );
if ( root ) {
	createRoot( root ).render( <Wizard /> );
}

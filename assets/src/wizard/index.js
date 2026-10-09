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
import { __, _n, sprintf } from '@wordpress/i18n';
import { wizardPost } from './api.js';
import { normalizePart } from '../shared/person-name.js';
import { StepShell } from './ui.jsx';
import { DoneStep, dashboardUrl } from './DoneStep.jsx';
import { STEPS, WizardHeader } from './Chrome.jsx';
import { groupTimezones, currencyLabel, phoneLooksValid, priceProblem, hoursSeed, stepNeedsSave } from './options.js';

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

	// WHAT THE SITE ALREADY HAS (persona QA 2026-10-05, re-test N2). A re-opened wizard showed the
	// factory 9–5 week and the WordPress user, and Continue wrote them over the owner's saved
	// hours and first staff member. Steps 3 and 4 are seeded from the stored values instead, and a
	// step is posted only when the owner changed it (`stepNeedsSave`) — clicking through a
	// re-opened wizard writes nothing. A stored week with split shifts cannot be shown in this
	// one-range-per-day grid, so the step then only says where those hours are edited.
	const saved = prefill.saved || {};
	const seededHours = useMemo( () => hoursSeed( saved.hours ), [] );
	const [ hours, setHours ] = useState( seededHours.map );

	// Name split (2026-10-01): the server prefills the WordPress user's `first_name` /
	// `last_name` meta (falling back to a split of the display name) and the step saves the parts.
	const [ staff, setStaff ] = useState( () => {
		const person = saved.staff || prefill.currentUser || {};
		return {
			first_name: person.first_name || '',
			last_name: person.last_name || '',
			email: person.email || '',
		};
	} );

	const [ service, setService ] = useState( {
		name: '',
		duration: 60,
		price: '',
	} );

	// What each step opened with, and whether that came from the site's stored values. Updated
	// when a step is saved, so Back → Continue does not post the same values twice.
	const seeds = useRef( null );
	if ( null === seeds.current ) {
		seeds.current = {
			business: { stored: true === saved.business, values: business },
			hours: { stored: seededHours.stored, values: hours },
			staff: { stored: Boolean( saved.staff ), values: staff },
		};
	}

	// Timezone menu from the IANA list; keep the prefilled value selectable even when it is not in
	// it — the same rule the currency menu below uses. A site that never picked a city prefills a
	// raw UTC OFFSET (`+07:00`), which is not an IANA identifier, and a `<select>` whose value
	// matches no option silently displays its FIRST one (Africa/Abidjan) — the wizard would then
	// name a country the business is not in. Offset 0 is normalized to `UTC` server-side
	// (WizardService::prefillTimezone); any other offset stays visible AS the offset, so the owner
	// sees what their site actually has and picks a city on purpose.
	//
	// Grouped by region (persona QA 2026-10-05, T-089): one flat list of ~420 identifiers made
	// the owner scroll past two continents to find their own city.
	const tzChoices = useMemo( () => groupTimezones( BOOT.timezones || [], prefill.timezone || '' ), [] );

	// Currency menu from the neutral global list; keep the prefilled code selectable even if it is
	// not in the curated list (the store accepts any valid 3-letter code).
	const currencyOptions = useMemo( () => {
		const codes = BOOT.currencies || [];
		const selected = prefill.currency || '';
		const list =
			selected && ! codes.includes( selected )
				? [ selected, ...codes ]
				: codes;
		// "USD — US Dollar", named by the browser in the admin's own language (T-089): a bare
		// three-letter code is a guess for anyone who does not already know theirs.
		const locale = ( typeof document !== 'undefined' && document.documentElement.lang ) || 'en';
		return list.map( ( c ) => ( { label: currencyLabel( c, locale ), value: c } ) );
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
	//
	// The SERVER's rule, per part: `first_name` is required, `last_name` is optional, and each is
	// at most 191 characters after the same normalization the server stores (trimmed, inner
	// whitespace collapsed). Counted in code points, as `mb_strlen` counts them.
	// Step 2 refusals the owner can see BEFORE pressing Continue (persona QA 2026-10-05, T-086 /
	// T-088): an empty business name and "abc not a phone" were both saved verbatim. Client-side
	// they hold the commit and say why; the server refuses them on its own
	// (`WizardService::saveBusiness()`), which is what `fieldErrors` carries.
	const businessNameError = '' === ( business.name || '' ).trim() ? __( 'Enter your business name.', 'aponto' ) : '';
	const businessPhoneError = phoneLooksValid( business.phone )
		? ''
		: __( 'Enter a phone number using digits, spaces and + ( ) - . only, or leave it blank.', 'aponto' );

	// Step 5: a negative price used to become a FREE service without a word (T-086).
	const servicePriceError = ( () => {
		const problem = priceProblem( service.price );
		if ( 'negative' === problem ) {
			return __( 'A price cannot be negative. Leave it blank for a free service.', 'aponto' );
		}
		return 'nan' === problem ? __( 'Enter the price as a number, or leave it blank.', 'aponto' ) : '';
	} )();

	const staffFirstNameError = useMemo( () => {
		const first = normalizePart( staff.first_name );
		if ( '' === first ) {
			return __( 'A first name is required.', 'aponto' );
		}
		if ( [ ...first ].length > MAX_FIELD ) {
			return __( 'This name is too long.', 'aponto' );
		}

		return '';
	}, [ staff.first_name ] );
	const staffLastNameError = useMemo( () => {
		if ( [ ...normalizePart( staff.last_name ) ].length > MAX_FIELD ) {
			return __( 'This name is too long.', 'aponto' );
		}

		return '';
	}, [ staff.last_name ] );

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

	// One request per press (persona QA 2026-10-05, T-066 family). `saving` disables the buttons
	// only from the NEXT render, so two taps in one frame both posted — and the service step is a
	// create. The ref is synchronous; every request path below takes it and releases it.
	const inFlight = useRef( false );

	async function save( doAction, payload, next ) {
		if ( inFlight.current ) {
			return false;
		}
		inFlight.current = true;
		setSaving( true );
		setError( '' );
		setFieldErrors( {} );
		try {
			await apiPost( doAction, payload );
			if ( typeof next === 'number' ) {
				setIndex( next );
				persistStep( next );
			}
			return true;
		} catch ( e ) {
			setError( e.message );
			// A refused step names its fields (SPEC-P1 §4); every other failure carries none, and
			// the notice alone is the right report for those.
			setFieldErrors( e && e.fields ? e.fields : {} );
			return false;
		} finally {
			inFlight.current = false;
			setSaving( false );
		}
	}

	/**
	 * Continue on a step that edits stored values: post it only when it changed (re-test N2).
	 *
	 * @param {string} key      Step key in `seeds`.
	 * @param {*}      current  The values on screen.
	 * @param {string} doAction Wizard action.
	 * @param {Object} payload  Request payload.
	 * @param {number} next     Step index to advance to.
	 */
	async function commitStep( key, current, doAction, payload, next ) {
		const seed = seeds.current[ key ];
		if ( ! stepNeedsSave( seed.stored, seed.values, current ) ) {
			go( next );
			return;
		}
		if ( await save( doAction, payload, next ) ) {
			seeds.current[ key ] = { stored: true, values: current };
		}
	}

	async function skipWizard() {
		if ( inFlight.current ) {
			return;
		}
		inFlight.current = true;
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
			inFlight.current = false;
			setSaving( false );
		}
	}

	/**
	 * Step 6 — create (or publish) the booking page. Fails LOUDLY when the server answered without a
	 * page DTO: leaving `page` null would silently redraw the same "Create booking page" button, the
	 * exact dead-button symptom this step was reported for.
	 */
	async function createPage() {
		if ( inFlight.current ) {
			return;
		}
		inFlight.current = true;
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
			inFlight.current = false;
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
		if ( inFlight.current ) {
			return;
		}
		inFlight.current = true;
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
			inFlight.current = false;
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
												disabled={ saving || '' !== businessNameError || '' !== businessPhoneError }
												onClick={ () =>
													commitStep(
														'business',
														business,
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
								onChange={ ( v ) => {
									setBusiness( { ...business, name: v } );
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ '' !== ( businessNameError || fieldErrors.name || '' ) && (
								<p className="aponto-wizard-field-error">
									{ businessNameError || fieldErrors.name }
								</p>
							) }
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
								type="tel"
								value={ business.phone }
								onChange={ ( v ) => {
									setBusiness( { ...business, phone: v } );
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ '' !== ( businessPhoneError || fieldErrors.phone || '' ) && (
								<p className="aponto-wizard-field-error">
									{ businessPhoneError || fieldErrors.phone }
								</p>
							) }
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Timezone', 'aponto' ) }
								// No hard-coded business noun (D-R52; persona QA T-059): this
								// said "your studio’s" to a hair salon and a medical clinic.
								help={ __(
									'Bookings are shown to each visitor in their own timezone; this is the local time at the business.',
									'aponto'
								) }
								value={ business.timezone }
								onChange={ ( v ) =>
									setBusiness( { ...business, timezone: v } )
								}
								__nextHasNoMarginBottom
							>
								{ tzChoices.loose.map( ( o ) => (
									<option key={ o.value } value={ o.value }>
										{ o.label }
									</option>
								) ) }
								{ tzChoices.groups.map( ( group ) => (
									<optgroup key={ group.label } label={ group.label }>
										{ group.options.map( ( o ) => (
											<option key={ o.value } value={ o.value }>
												{ o.label }
											</option>
										) ) }
									</optgroup>
								) ) }
							</SelectControl>
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
								{ /* An EXAMPLE, rendered by the server in the site's language (T-080).
								     This printed the raw PHP codes — "(F j, Y, g:i a)". Boot data
								     older than this bundle has no example and names no format. */ }
								{ prefill.dateExample && prefill.timeExample
									? sprintf(
										/* translators: 1: today's date in the site's date format, 2: the current time in the site's time format. */
										__(
											'Dates and times will look like this: %1$s, %2$s. The format and the week start come from WordPress; you can change them later in Settings.',
											'aponto'
										),
										prefill.dateExample,
										prefill.timeExample
									)
									: __(
										'The date and time format and the week start come from WordPress; you can change them later in Settings.',
										'aponto'
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
												disabled={ saving || ( ! seededHours.split && hasHourErrors ) }
												onClick={ () =>
													seededHours.split ? go( 3 ) : commitStep(
														'hours',
														hours,
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
							{ seededHours.split && (
								<p className="aponto-wizard-muted">
									{ __(
										'Your business hours are already set, with more than one range on some days. This step keeps them as they are — change them in Settings → Business hours.',
										'aponto'
									) }
								</p>
							) }
							{ ! seededHours.split && openDays.length >= 2 && (
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
							{ ( seededHours.split ? [] : dayOrder ).map( ( iso ) => {
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
																// The two selects of a row had no name at all (T-078):
																// a screen reader announced "combo box, 9:00 AM" seven
																// times over.
																aria-label={ sprintf(
																	/* translators: %s: weekday name. */
																	__( '%s opens at', 'aponto' ),
																	dayName
																) }
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
																aria-label={ sprintf(
																	/* translators: %s: weekday name. */
																	__( '%s closes at', 'aponto' ),
																	dayName
																) }
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
							{ /* One range per day is all this step asks for — but nothing said a
							     lunch break or a split shift can be added afterwards, so an owner with
							     6–11 and 15–20 saved only the morning (persona QA 2026-10-05, T-087). */ }
							{ ! seededHours.split && (
								<p className="aponto-wizard-muted">
									{ __(
										'Lunch breaks and split shifts: add more hours per day later in Settings → Business hours.',
										'aponto'
									) }
								</p>
							) }
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
													'' !== staffFirstNameError ||
													'' !== staffLastNameError ||
													'' !== staffEmailError
												}
												onClick={ () =>
													commitStep(
														'staff',
														staff,
														'staff',
														{
															first_name: normalizePart( staff.first_name ),
															last_name: normalizePart( staff.last_name ),
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
								label={ __( 'First name', 'aponto' ) }
								autoComplete="given-name"
								value={ staff.first_name }
								onChange={ ( v ) => {
									setStaff( { ...staff, first_name: v } );
									// The server's verdict described the value that was just
									// replaced — drop it as soon as the founder edits the field.
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ '' !== ( staffFirstNameError || fieldErrors.first_name || '' ) && (
								<p className="aponto-wizard-field-error">
									{ staffFirstNameError || fieldErrors.first_name }
								</p>
							) }
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Last name', 'aponto' ) }
								autoComplete="family-name"
								value={ staff.last_name }
								onChange={ ( v ) => {
									setStaff( { ...staff, last_name: v } );
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ '' !== ( staffLastNameError || fieldErrors.last_name || '' ) && (
								<p className="aponto-wizard-field-error">
									{ staffLastNameError || fieldErrors.last_name }
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
												disabled={ saving || ! service.name.trim() || '' !== servicePriceError }
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
								onChange={ ( v ) => {
									setService( { ...service, name: v } );
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ /* Re-test N11: with an empty name the button is held disabled (the rule every
							     commit in this wizard follows) and NOTHING said why. The reason sits under
							     the field now — a hint, not an error, because the step opens empty. */ }
							{ fieldErrors.name ? (
								<p className="aponto-wizard-field-error">{ fieldErrors.name }</p>
							) : null }
							{ ! fieldErrors.name && ! service.name.trim() ? (
								<p className="aponto-wizard-muted">
									{ __( 'Enter a name for the service to create it, or skip this step.', 'aponto' ) }
								</p>
							) : null }
							{ Number( saved.services ) > 0 ? (
								<p className="aponto-wizard-muted">
									{ sprintf(
										/* translators: %d: number of services the site already has. */
										_n(
											'You already have %d service. Create another here, or skip this step.',
											'You already have %d services. Create another here, or skip this step.',
											Number( saved.services ),
											'aponto'
										),
										Number( saved.services )
									) }
								</p>
							) : null }
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
								// The currency the owner picked two steps ago, in the label (T-086):
								// a bare "Price" field does not say what the number is a price IN.
								label={ sprintf(
									/* translators: %s: currency code, e.g. USD. */
									__( 'Price in %s (optional)', 'aponto' ),
									business.currency
								) }
								type="number"
								min="0"
								step="any"
								value={ service.price }
								onChange={ ( v ) => {
									setService( { ...service, price: v } );
									setFieldErrors( {} );
								} }
								__nextHasNoMarginBottom
							/>
							{ '' !== ( servicePriceError || fieldErrors.price || '' ) && (
								<p className="aponto-wizard-field-error">
									{ servicePriceError || fieldErrors.price }
								</p>
							) }
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

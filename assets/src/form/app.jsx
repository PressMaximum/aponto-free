/** @jsxImportSource preact */
/**
 * Booking widget root — the client-side state machine for the V1 four-step flow
 * (Service · Date & time · Details · Confirmation). The server stays stateless;
 * all draft state lives here.
 *
 * Responsibilities wired here (SPEC-P1 §2):
 *  - Deterministic timezone init (D1): resolve display_tz once, render the
 *    selector only when the browser zone differs, keep every surface on one
 *    display_tz, and persist `customer_timezone` = display_tz at submit.
 *  - Idempotency lifecycle: key created on entering Details, reused across
 *    retries, rotated when the draft changes (SPEC-P0 §5.6).
 *  - Full error recovery: 409 slot-taken → back to Date & time + toast + refresh;
 *    422 → inline field errors; 429 → Retry-After countdown; 425 → poll same key;
 *    503 → auto-retry once then manual; idempotency replay → "check email" panel.
 *  - Container-adaptive layout: sidebar summary ≥700px, in-flow recap accordion
 *    below, driven purely by container queries (no viewport media).
 *  - Inline payment (D-R38): a fifth step appears — and the fraction renumbers —
 *    only when the site takes money AND the chosen service costs something. The
 *    gateway's own UI is NOT part of this tree: adapters own a light-DOM holder
 *    projected back through `<slot>`, because Stripe refuses to mount inside a
 *    ShadowRoot and its Payment Element fails silently when you try (spike).
 *    This component owns the ORDER of the payment sequence (validate → hold →
 *    charge → confirm) and the release of a hold nobody is going to pay for.
 */
import {
	useState,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useCallback,
} from 'preact/hooks';
import { createApi } from './lib/api.js';
import { createIdempotencyManager } from './lib/idempotency.js';
import {
	browserTimezone,
	canonicalizeZone,
	resolveDisplayTz,
	groupSlotsByDay,
	dayKeyInTz,
	fmtTime,
} from './lib/tz.js';
import { classifyError } from './lib/errors.js';
import { COPY, sprintf, paymentFailureCopy } from './lib/copy.js';
import { ServiceStep } from './components/ServiceStep.jsx';
import { DateTimeStep } from './components/DateTimeStep.jsx';
import { DetailsStep, customKey } from './components/DetailsStep.jsx';
import { PaymentStep, ONSITE } from './components/PaymentStep.jsx';
import {
	Confirmation,
	MinimalConfirmation,
	PaymentIncomplete,
	ResumeUnavailable,
} from './components/Confirmation.jsx';
import {
	Summary,
	recapLine,
	SUMMARY_HEADING_ID,
} from './components/Summary.jsx';
import { Toast, Banner } from './components/feedback.jsx';
import { ServiceSkeleton } from './components/Skeletons.jsx';
import {
	createGatewayAdapter,
	gatewayCancelledCopy,
	gatewayUnavailableCopy,
	isRenderable,
} from './lib/payments.js';
import { formatMoney } from './lib/format.js';
import {
	manageToken,
	storeHold,
	readHold,
	clearHold,
	readReturn,
	readResume,
	buildReturnUrl,
	stripReturn,
} from './lib/hold.js';

const COMMON_ZONES = [
	'UTC',
	'America/New_York',
	'America/Chicago',
	'America/Los_Angeles',
	'America/Sao_Paulo',
	'Europe/London',
	'Europe/Berlin',
	'Europe/Paris',
	'Africa/Cairo',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Bangkok',
	'Asia/Ho_Chi_Minh',
	'Asia/Singapore',
	'Asia/Tokyo',
	'Australia/Sydney',
	'Pacific/Auckland',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Disclosure target for the narrow-container recap bar (ShadowRoot-scoped id). */
const RECAP_PANEL_ID = 'ap-recap-panel';

/**
 * Thrown out of the payment sequence when the booking leg already failed AND
 * already told the visitor about it. It carries no message on purpose: the
 * recovery UI for a 409/425/429/503 is the one the widget has always had, and
 * the payment layer must not paint a second, vaguer error on top of it.
 */
const HANDLED = { handled: true };

/**
 * The `payment.status: "pending"` wait budget (rest-contract §3.3).
 *
 * The server suggests `retry_after_ms`; these bound it. The floor stops a
 * misbehaving server from turning the wait into a busy loop, the ceiling and the
 * two totals stop a customer from staring at a spinner while a dead request's
 * lease runs down — 20 s is comfortably inside the 60 s lease, so giving up here
 * always leaves time for the manual retry the customer is then offered.
 */
const PAY_WAIT_MIN_MS = 250;
const PAY_WAIT_MAX_MS = 5000;
const PAY_WAIT_ATTEMPTS = 6;
const PAY_WAIT_TOTAL_MS = 20000;

/**
 * How many times a RESUME is re-sent after a `503 aponto_lock_timeout`.
 *
 * A different failure from the `pending` wait above, and it needs its own budget
 * because it is a different sentence: `pending` means "your claim exists and the
 * reference is coming", while `503` means "somebody else holds this order's lock
 * right now" — the webhook that just settled a sibling event, the expiry cron, a
 * second tab. Both clear in well under a second, and neither says the hold is
 * gone. Three tries at 250/500 ms, then a retryable banner (D-R39c round 2,
 * Codex NEW-4).
 */
const RESUME_BUSY_ATTEMPTS = 3;

/**
 * Milliseconds to wait before re-sending a resume the server called busy.
 *
 * Honours `retry_after_ms` when the refusal carries one, and otherwise backs off
 * exponentially from the same floor the `pending` protocol uses; bounded by the
 * same ceiling, so a hostile or confused value cannot park the customer.
 *
 * @param {Object} error   The rejected ApiError.
 * @param {number} attempt Zero-based retry number.
 * @return {number} Delay in milliseconds.
 */
function busyRetryDelay( error, attempt ) {
	const hinted = Number(
		( error && error.data && error.data.retry_after_ms ) || 0
	);
	const delay = hinted > 0 ? hinted : PAY_WAIT_MIN_MS * Math.pow( 2, attempt );

	return Math.min( Math.max( delay, PAY_WAIT_MIN_MS ), PAY_WAIT_MAX_MS );
}

/**
 * The widget host element (`[data-aponto-form]`) a gateway must mount beside.
 *
 * Reached through the ShadowRoot in production and through the DOM in a jsdom
 * test, because the host is the one node the gateway holder may be a child of —
 * the shield's `>` combinator and the `<slot>` projection both depend on it.
 *
 * @param {?HTMLElement} el Any element inside the widget (`.ap-wrap`).
 * @return {?HTMLElement} The host, or null.
 */
function widgetHost( el ) {
	if ( ! el ) {
		return null;
	}
	const root = typeof el.getRootNode === 'function' ? el.getRootNode() : null;
	if ( root && root.host ) {
		return root.host;
	}
	return typeof el.closest === 'function'
		? el.closest( '[data-aponto-form]' )
		: null;
}

function pad2( n ) {
	return n < 10 ? '0' + n : '' + n;
}

/** Build the availability fetch date-range for a display-tz calendar month. */
function monthRange( year, month ) {
	const last = new Date( Date.UTC( year, month + 1, 0 ) ).getUTCDate();
	return {
		from_date: year + '-' + pad2( month + 1 ) + '-01',
		to_date: year + '-' + pad2( month + 1 ) + '-' + pad2( last ),
	};
}

export function App( { config } ) {
	const api = useMemo( () => createApi( config ), [ config ] );
	const idem = useMemo( () => createIdempotencyManager(), [] );

	// Focus the step heading only AFTER the visitor has driven a step change —
	// never on the widget's first paint (that would steal focus / scroll the page
	// the moment the block appears). Preselect auto-advance also leaves this false
	// so a preselected form doesn't grab focus on load. A ref (not state) keeps the
	// value readable during the same render that triggers the new step's mount.
	const navigatedRef = useRef( false );
	const markNav = useCallback( () => {
		navigatedRef.current = true;
	}, [] );

	const preselectedId = config.serviceId || null;

	// --- Timezone (init once, deterministic). ---------------------------------
	const tzInit = useMemo( () => {
		const businessTz = canonicalizeZone( config.business.timezone || 'UTC' );
		const browserTz = browserTimezone();
		return resolveDisplayTz( { browserTz, businessTz } );
	}, [ config ] );
	const [ displayTz, setDisplayTz ] = useState( tzInit.displayTz );
	const businessTz = tzInit.businessTz;
	const showSelector = tzInit.showSelector;
	const tzOptions = useMemo( () => {
		const set = [];
		[ tzInit.browserTz, businessTz, ...COMMON_ZONES ].forEach( ( z ) => {
			if ( z && ! set.includes( z ) ) {
				set.push( z );
			}
		} );
		return set;
	}, [ tzInit, businessTz ] );

	// --- Catalogue. -----------------------------------------------------------
	const [ catalogue, setCatalogue ] = useState( {
		loading: true,
		error: false,
		services: [],
		categories: [],
	} );
	const [ service, setService ] = useState( null );

	// A gateway RETURN leg (`?aponto_pay=…`) is a continuation, not a first
	// visit: the page must not flash the catalogue on its way to a confirmation
	// panel. Read once, from the URL the page loaded with.
	const returnLeg = useMemo(
		() =>
			readReturn(
				typeof window !== 'undefined' && window.location
					? window.location.search
					: ''
			),
		[]
	);
	/**
	 * A RESUME leg (`?aponto_resume=<manage token>`) — the link in the "complete
	 * your payment" reminder (PR-A.3).
	 *
	 * Read once, from the URL the page loaded with, for the same reason the
	 * return leg is: this visitor is finishing something, not starting it, and
	 * the catalogue must not flash past on the way to the Payment step.
	 */
	const resumeToken = useMemo(
		() =>
			readResume(
				typeof window !== 'undefined' && window.location ? window.location.search : '',
				typeof window !== 'undefined' && window.location ? window.location.hash : ''
			),
		[]
	);
	const [ step, setStep ] = useState(
		resumeToken ? 'payment' : returnLeg ? 'confirmation' : 'service'
	);

	// The Service step is skipped when there is nothing to choose: a block-preselected service, OR
	// exactly one active service in the catalogue (B1 — finding U3 Jonas: making a lone service a
	// mandatory click is friction). The service still shows in the summary; the step fraction
	// renumbers honestly (3 steps, not 4) because `stepList` keys off this flag below.
	const singleService = ! preselectedId && ! catalogue.loading && catalogue.services.length === 1;
	const serviceLocked = !! preselectedId || singleService;

	// True once the first available day has been auto-picked for the current service, so a manual
	// pick or deliberate month browsing afterwards is never overridden (B1). Reset whenever the
	// visitor (re-)enters Date & time for a service.
	const autoPickedRef = useRef( false );

	const loadCatalogue = useCallback( () => {
		setCatalogue( ( c ) => Object.assign( {}, c, { loading: true, error: false } ) );
		api.getServices().then(
			( res ) => {
				const services = res.items || [];
				setCatalogue( {
					loading: false,
					error: false,
					services,
					categories: res.categories || [],
				} );
				// A gateway return leg is already showing an outcome panel; the
				// catalogue must not shove the visitor back into the flow behind
				// it just because there is one service to preselect.
				if ( returnLeg || resumeToken ) {
					return;
				}
				if ( preselectedId ) {
					const found = services.find( ( s ) => s.id === preselectedId );
					if ( found ) {
						autoPickedRef.current = false;
						setService( found );
						setStep( 'datetime' );
					}
				} else if ( services.length === 1 ) {
					// One active service → skip the Service step (B1). No markNav() so the
					// auto-advance doesn't steal focus on first paint, same as preselect.
					autoPickedRef.current = false;
					setService( services[ 0 ] );
					setStep( 'datetime' );
				}
			},
			() => setCatalogue( ( c ) => Object.assign( {}, c, { loading: false, error: true } ) )
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ api, preselectedId ] );

	useEffect( () => {
		loadCatalogue();
	}, [ loadCatalogue ] );

	// --- Calendar + availability. --------------------------------------------
	const nowKey = dayKeyInTz( Date.now(), displayTz );
	const initialYear = Number( nowKey.slice( 0, 4 ) );
	const initialMonth = Number( nowKey.slice( 5, 7 ) ) - 1;
	const [ cal, setCal ] = useState( { year: initialYear, month: initialMonth } );
	const [ avail, setAvail ] = useState( {
		loading: false,
		error: false,
		index: {},
		maxSlots: 1,
	} );
	const [ selectedDayKey, setSelectedDayKey ] = useState( null );
	const [ selectedSlotUtc, setSelectedSlotUtc ] = useState( null );
	const fetchToken = useRef( 0 );

	const fetchAvailability = useCallback(
		( year, month, tz ) => {
			if ( ! service ) {
				return;
			}
			const token = ++fetchToken.current;
			setAvail( ( a ) => Object.assign( {}, a, { loading: true, error: false } ) );
			const range = monthRange( year, month );
			api.getAvailability(
				Object.assign(
					{
						service_id: service.id,
						staff_id: config.staffId || null,
						tz,
					},
					range
				)
			).then(
				( res ) => {
					if ( token !== fetchToken.current ) {
						return;
					}
					const index = groupSlotsByDay( res.slots || [], tz );
					let maxSlots = 1;
					Object.keys( index ).forEach( ( k ) => {
						maxSlots = Math.max( maxSlots, index[ k ].length );
					} );
					setAvail( { loading: false, error: false, index, maxSlots } );
				},
				() => {
					if ( token !== fetchToken.current ) {
						return;
					}
					setAvail( ( a ) =>
						Object.assign( {}, a, { loading: false, error: true } )
					);
				}
			);
		},
		[ api, service, config.staffId ]
	);

	// Refetch whenever the visible month, the display timezone, or the service change.
	useEffect( () => {
		if ( step === 'datetime' && service ) {
			fetchAvailability( cal.year, cal.month, displayTz );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ step, service, cal.year, cal.month, displayTz ] );

	// Auto-select the first day that has availability so times render immediately, Calendly-style
	// (B1 — finding U3 Jonas). Only the FIRST time per service-entry (autoPickedRef) and only while
	// nothing is chosen, so a manual pick or deliberate month browsing is respected. When the
	// visible month has no slots the pick defers to the first month the visitor navigates to that
	// does — the earliest bookable day, wherever it first appears.
	useEffect( () => {
		if ( step !== 'datetime' || avail.loading || selectedDayKey || autoPickedRef.current ) {
			return;
		}
		const keys = Object.keys( avail.index ).sort();
		if ( keys.length > 0 ) {
			autoPickedRef.current = true;
			setSelectedDayKey( keys[ 0 ] );
		}
	}, [ step, avail.index, avail.loading, selectedDayKey ] );

	// --- Details + submit. ----------------------------------------------------
	const [ details, setDetails ] = useState( { name: '', email: '', phone: '', note: '' } );
	const [ consent, setConsent ] = useState( false );
	// Answers to the site's extra booking-form fields, keyed by slug (D-R30).
	// Absent = unanswered; the submitted body carries only answered ones.
	const [ customValues, setCustomValues ] = useState( {} );
	const [ honeypot, setHoneypot ] = useState( '' );
	const [ fieldErrors, setFieldErrors ] = useState( null );
	const [ submitting, setSubmitting ] = useState( false );
	const [ submitError, setSubmitError ] = useState( null );
	const [ rateSeconds, setRateSeconds ] = useState( 0 );
	const [ toast, setToast ] = useState( null );
	const [ response, setResponse ] = useState( null );

	// --- Payment (D-R38). -----------------------------------------------------
	// Memoised so its identity is stable even on a config that predates D-R38 and
	// carries no `payments` key: `gateways` derives from it, and the gateway
	// lifecycle effect keys on `gateways` — a fresh object literal every render
	// would re-run that effect on every render.
	const payments = useMemo(
		() =>
			config.payments || { mode: 'off', holdMinutes: 30, gateways: [] },
		[ config ]
	);
	// The server decides what is OFFERED; this bundle decides what it can DRAW.
	// A gateway the site enables but this build has no adapter for is dropped
	// rather than rendered as a dead card.
	const gateways = useMemo(
		() => ( payments.gateways || [] ).filter( isRenderable ),
		[ payments ]
	);
	const [ payMethod, setPayMethod ] = useState( null );
	const [ payError, setPayError ] = useState( '' );
	const [ payNotice, setPayNotice ] = useState( null );
	const [ gatewayReady, setGatewayReady ] = useState( false );
	const [ gatewayLoading, setGatewayLoading ] = useState( false );
	// The STEP LOCK for a gateway that owns the CTA (D-R40, Codex r1 #5). While
	// PayPal has an attempt in flight the buyer may already have approved an order
	// the server can still capture, so nothing that would abandon the booking may
	// run: Back, a method change, "Pay on-site instead", a hold release. Kept as a
	// ref AS WELL as state because the guards run inside callbacks that must not
	// depend on a render having happened first.
	const [ gatewayBusy, setGatewayBusy ] = useState( false );
	const gatewayBusyRef = useRef( false );
	// What the confirmation panel says about the money, if anything.
	const [ payResult, setPayResult ] = useState( null );
	const [ payIncomplete, setPayIncomplete ] = useState( null );
	const [ minimalConfirm, setMinimalConfirm ] = useState( null );
	// The LIVE hold: what the widget needs to hand the slot back without waiting
	// for the expiry cron. A ref, not state — releasing it must never depend on a
	// render having happened.
	const holdRef = useRef( null );
	// One adapter per gateway the visitor has actually selected, kept alive for
	// the life of the step so switching methods does not reload an iframe (and
	// lose whatever was typed into it). Destroyed together on leaving the step.
	const adaptersRef = useRef( {} );
	// Which gateways are still COMING UP, by code (verify round 2). An adapter is
	// registered in `adaptersRef` synchronously and becomes usable hundreds of
	// milliseconds later, so "is it mounted" and "is it ready" are two different
	// questions — and the loading line answers the second one, about the SELECTED
	// method only. A single global flag could not: selecting PayPal set it, and
	// coming back to an already-registered card adapter took the early-return
	// branch that only refreshed `gatewayReady`, so the line stayed on the card
	// panel for ever with nothing left to turn it off (PayPal's own settle sees
	// itself superseded and correctly says nothing about a method it is not).
	const mountingRef = useRef( {} );
	const wrapRef = useRef( null );
	// Bumped by "Try again" on a gateway that never came up, so the mount effect
	// runs once more without anything else about the step having changed.
	const [ mountNonce, setMountNonce ] = useState( 0 );
	// The method selected RIGHT NOW (Codex r1 #17). A gateway mount is
	// asynchronous on three axes — the SDK fetch, the element's own render, the
	// mount promise — and the visitor can change their mind inside all three, so
	// every settle asks this ref rather than trusting what its closure captured:
	// a PayPal render that lands after the buyer chose Stripe cannot show its
	// buttons, and cannot leave a live button behind that would check out against
	// a method nobody is looking at.
	//
	// Moved SYNCHRONOUSLY with the click by {@link selectMethod}, not one render
	// later: a settle landing between the commit and the effect flush would
	// otherwise read the previous selection and unhide a gateway the visitor has
	// just left.
	const selectedMethodRef = useRef( null );
	// The widget's half of the payment sequence, for a gateway that starts it
	// from its OWN control (PayPal). Refreshed after every render so the buttons
	// always call the CURRENT closures rather than the ones captured when they
	// were rendered — a mount that is deliberately never repeated.
	const gatewayFlowRef = useRef( {} );
	// RESUME: what the server handed back for an existing hold. `resumeRef` is
	// what `begin()` resolves on this path — the intent already exists, so the
	// sequence skips straight to `confirmPayment` and creates no second booking.
	const [ resume, setResume ] = useState( null );
	const [ resumeError, setResumeError ] = useState( null );
	const resumeRef = useRef( null );

	/**
	 * Whether this booking has a Payment step at all — re-derived on EVERY
	 * render, never remembered, so the fraction can never promise a step the
	 * current selection does not have.
	 *
	 * All three conditions are the server's own (rest-contract §3.3): a site with
	 * `mode: off` or nothing offered takes no method, and a free or unpriced
	 * service never takes one whatever the mode says. Deriving the step from the
	 * same predicate the route validates is what stops the widget from building a
	 * request the route will reject.
	 *
	 * On the Service step there is no selection yet, so the price question is
	 * asked of the CATALOGUE instead: a site whose services cost money shows the
	 * five-step fraction from the first screen rather than growing a step under
	 * the visitor's feet. It still renumbers for the visitor who then picks a
	 * free service — that is a real change to their flow, not a lie about it.
	 */
	const paymentStepExists =
		!! resume ||
		( payments.mode !== 'off' &&
			gateways.length > 0 &&
			( service
				? Number( service.price_minor ) > 0
				: catalogue.services.some(
						( s ) => Number( s.price_minor ) > 0
				  ) ) );

	/**
	 * The site currency's ISO exponent, from the server (D-R39a).
	 *
	 * Every money string the widget prints goes through it, because `Intl`'s own
	 * digit table disagrees with ISO for at least one live currency and the
	 * stored `price_minor` was written against ISO.
	 */
	// On a resume the ORDER's own exponent wins: that order was priced against it,
	// and the widget never loaded the catalogue this page's boot data describes.
	const currencyExponent =
		resume && resume.order && resume.order.currency_exponent !== null
			? resume.order.currency_exponent
			: payments.currencyExponent;

	/** The order total, formatted exactly as the summary already shows it. */
	const totalLabel = service
		? formatMoney(
				service.price_minor,
				service.currency,
				config.locale,
				currencyExponent
		  )
		: '';

	/**
	 * A local clock-time label for a hold deadline.
	 *
	 * @param {?string} iso RFC3339 instant, or null to project from `hold_minutes`.
	 * @return {?string} Label, or null when neither is available.
	 */
	function deadlineLabel( iso ) {
		if ( iso ) {
			return fmtTime( iso, displayTz, config.locale );
		}
		if ( ! payments.holdMinutes ) {
			return null;
		}
		return fmtTime(
			new Date(
				Date.now() + payments.holdMinutes * 60000
			).toISOString(),
			displayTz,
			config.locale
		);
	}

	// Rate-limit countdown.
	useEffect( () => {
		if ( rateSeconds <= 0 ) {
			return undefined;
		}
		const t = setTimeout( () => {
			const next = rateSeconds - 1;
			setRateSeconds( next );
			if ( next <= 0 ) {
				setSubmitError( ( e ) =>
					e && e.kind === 'rate_limited' ? null : e
				);
			}
		}, 1000 );
		return () => clearTimeout( t );
	}, [ rateSeconds ] );

	// Auto-dismiss the slot-taken toast.
	useEffect( () => {
		if ( ! toast ) {
			return undefined;
		}
		const t = setTimeout( () => setToast( null ), 6000 );
		return () => clearTimeout( t );
	}, [ toast ] );

	const phoneMode = config.fields.phone;
	const consentEnabled = config.fields.consent.enabled;
	const customFields = config.fields.custom || [];

	/**
	 * The answered custom fields, trimmed and pruned exactly the way the server
	 * validates them (D-R30): a blank answer and an unchecked box are "not
	 * answered", so they must be absent on BOTH sides — the fingerprint and the
	 * body are built from this one map, so they can never disagree.
	 *
	 * @return {Object} `slug -> string|true`, only for answered fields.
	 */
	function collectCustom() {
		const out = {};
		customFields.forEach( ( f ) => {
			const raw = customValues[ f.slug ];
			if ( f.type === 'checkbox' ) {
				if ( raw === true ) {
					out[ f.slug ] = true;
				}
				return;
			}
			const value = ( raw === undefined || raw === null ? '' : String( raw ) ).trim();
			if ( value ) {
				out[ f.slug ] = value;
			}
		} );
		return out;
	}

	/**
	 * The payment module code this draft would be submitted with, or `''`.
	 *
	 * `''` for on-site, for a step that does not exist, and for a free service —
	 * and `''` is what keeps the fingerprint byte-identical to the pre-payment
	 * build on a site that takes no money (D-R38 / `idempotency.js`).
	 *
	 * @param {string} [override] Method being switched TO, before state updates.
	 * @return {string} Module code or ''.
	 */
	function paymentMethodOf( override ) {
		if ( ! paymentStepExists ) {
			return '';
		}
		const method = override === undefined ? payMethod : override;
		return method && method !== ONSITE ? method : '';
	}

	function buildDraft( methodOverride ) {
		// Trim every customer field symmetrically. Because the idempotency key
		// rotates on the draft fingerprint (which trims) while the request body is
		// built from the same draft, an untrimmed field here would let a trailing
		// space change the body WITHOUT rotating the key → a spurious
		// `aponto_idempotency_conflict`. Trimming once, at the source, keeps the
		// fingerprint and the body in lockstep.
		return {
			service_id: service ? service.id : null,
			staff_id: config.staffId || null,
			start_utc: selectedSlotUtc,
			tz: displayTz,
			consent: consentEnabled ? consent : false,
			customer: {
				name: details.name.trim(),
				email: details.email.trim(),
				phone: phoneMode === 'off' ? '' : details.phone.trim(),
				note: details.note.trim(),
			},
			custom_fields: collectCustom(),
			payment_method: paymentMethodOf( methodOverride ),
		};
	}

	function buildBody( draft ) {
		// The draft is already trimmed (see buildDraft) so the body passes the
		// values through unchanged — same bytes the fingerprint hashed.
		const body = {
			service_id: draft.service_id,
			start_utc: draft.start_utc,
			tz: draft.tz,
			consent: draft.consent,
			customer: {
				name: draft.customer.name,
				email: draft.customer.email,
				phone: draft.customer.phone,
				note: draft.customer.note,
			},
		};
		if ( draft.staff_id ) {
			body.staff_id = draft.staff_id;
		}
		// Only ever sent when the site declares fields AND the visitor answered
		// one: on a build that collects none the key never appears, so the
		// server's allow-list stays exactly as strict as before (D-R30).
		if ( Object.keys( draft.custom_fields || {} ).length ) {
			body.custom_fields = draft.custom_fields;
		}
		// Same conditional-key rule as `custom_fields`: absent unless the visitor
		// actually chose to pay online, so the public surface of a site that does
		// not sell is byte-identical to the build before D-R38. The body carries
		// NO amount — the server charges what the order says (D-R38c).
		if ( draft.payment_method ) {
			body.payment = { method: draft.payment_method };
		}
		return body;
	}

	function validateDetails() {
		const e = {};
		if ( ! details.name.trim() ) {
			e.name = COPY.err_name_required;
		}
		if ( ! details.email.trim() ) {
			e.email = COPY.err_email_required;
		} else if ( ! EMAIL_RE.test( details.email.trim() ) ) {
			e.email = COPY.err_email_invalid;
		}
		if ( phoneMode === 'required' && ! details.phone.trim() ) {
			e.phone = COPY.err_phone_required;
		}
		if ( consentEnabled && ! consent ) {
			e.consent = COPY.err_consent_required;
		}
		// Custom fields: required + length, mirroring the server rules the
		// visitor would otherwise only meet as a 422 after a round trip.
		customFields.forEach( ( f ) => {
			const key = customKey( f.slug );
			const raw = customValues[ f.slug ];
			if ( f.type === 'checkbox' ) {
				if ( f.required && raw !== true ) {
					e[ key ] = COPY.err_field_required;
				}
				return;
			}
			const value = ( raw === undefined || raw === null ? '' : String( raw ) ).trim();
			if ( ! value ) {
				if ( f.required ) {
					e[ key ] = COPY.err_field_required;
				}
				return;
			}
			if ( f.maxLength && value.length > f.maxLength ) {
				e[ key ] = sprintf( COPY.err_field_too_long, f.maxLength );
			}
		} );
		return Object.keys( e ).length ? e : null;
	}

	const backToDateTimeRefresh = useCallback(
		( toastPayload ) => {
			setStep( 'datetime' );
			setSelectedSlotUtc( null );
			setSubmitting( false );
			if ( toastPayload ) {
				setToast( toastPayload );
			}
			fetchAvailability( cal.year, cal.month, displayTz );
		},
		[ cal.year, cal.month, displayTz, fetchAvailability ]
	);

	/**
	 * POST the booking, absorbing every retryable failure the contract defines.
	 *
	 * Returns `{ok:true, response}` or `{ok:false}` — it no longer decides what a
	 * successful booking LEADS to, because that now has two answers: a free
	 * booking goes straight to the confirmation, a paid one goes on to the
	 * gateway. Every `{ok:false}` path has already put its own recovery UI on
	 * screen; the caller must not add a second message.
	 */
	const attemptBooking = useCallback(
		async function attempt( body, key, ctx ) {
			try {
				const res = await api.createBooking( body, key );
				setSubmitError( null );
				return { ok: true, response: res };
			} catch ( raw ) {
				const info = classifyError( raw );
				switch ( info.kind ) {
					case 'slot_taken':
					case 'not_found':
						backToDateTimeRefresh( {
							title: COPY.toast_slot_taken_title,
							body: COPY.toast_slot_taken_body,
						} );
						break;
					case 'validation': {
						const mapped = mapFieldErrors( info.fields );
						const fieldKeys = Object.keys( mapped ).filter(
							( k ) => k !== '__slot' && k !== '__stale'
						);
						if ( mapped.__slot ) {
							backToDateTimeRefresh( {
								title: COPY.toast_slot_taken_title,
								body: COPY.err_pick_time,
							} );
						} else if ( mapped.__stale ) {
							// The form is older than the site's field list. Show
							// the server's own public-safe message plus the one
							// action that can fix it, and still mark up any error
							// that DOES have a field so nothing is hidden.
							setSubmitError( {
								kind: 'validation_stale',
								message: String( mapped.__stale ),
							} );
							setFieldErrors( fieldKeys.length ? mapped : null );
							setSubmitting( false );
						} else if ( fieldKeys.length ) {
							setFieldErrors( mapped );
							setSubmitting( false );
						} else {
							// A 422 we could not attribute to any known field
							// (e.g. a server-side rule the client does not model).
							// Surface a general banner rather than failing silently,
							// preferring the server's public-safe message when present.
							setSubmitError( {
								kind: 'validation_general',
								message:
									raw && raw.message
										? String( raw.message )
										: '',
							} );
							setSubmitting( false );
						}
						break;
					}
					case 'rate_limited':
						setSubmitError( { kind: 'rate_limited' } );
						setRateSeconds(
							info.retryAfter && info.retryAfter > 0
								? Math.ceil( info.retryAfter )
								: 30
						);
						setSubmitting( false );
						break;
					case 'lock_timeout':
						if ( ! ctx.lockRetried ) {
							await new Promise( ( r ) => setTimeout( r, 600 ) );
							return attempt( body, key, {
								...ctx,
								lockRetried: true,
							} );
						}
						setSubmitError( { kind: 'lock_timeout' } );
						setSubmitting( false );
						break;
					case 'in_flight':
						if ( ctx.inflightTries < 4 ) {
							setSubmitError( { kind: 'in_flight' } );
							await new Promise( ( r ) => setTimeout( r, 2000 ) );
							return attempt( body, key, {
								...ctx,
								inflightTries: ctx.inflightTries + 1,
							} );
						}
						setSubmitError( { kind: 'in_flight_manual' } );
						setSubmitting( false );
						break;
					case 'conflict':
						if ( ! ctx.conflictRetried ) {
							idem.reset();
							// The draft travels in `ctx` rather than being rebuilt
							// here: this callback is memoised, so a rebuilt draft
							// would be the one from the render that created it —
							// and a fingerprint taken from stale state is exactly
							// the bug this branch exists to recover from.
							return attempt( body, idem.keyFor( ctx.draft ), {
								...ctx,
								conflictRetried: true,
							} );
						}
						setSubmitError( { kind: 'guard' } );
						setSubmitting( false );
						break;
					case 'guard':
						setSubmitError( { kind: 'guard' } );
						setSubmitting( false );
						break;
					default:
						setSubmitError( { kind: 'network' } );
						setSubmitting( false );
				}
				return { ok: false };
			}
		},
		[ api, idem, backToDateTimeRefresh ] // eslint-disable-line react-hooks/exhaustive-deps
	);

	function mapFieldErrors( fields ) {
		const out = {};
		if ( ! fields ) {
			return out;
		}
		// The error keys this page actually has an input for.
		const renderedCustomSlugs = new Set(
			customFields.map( ( f ) => customKey( f.slug ) )
		);
		Object.keys( fields ).forEach( ( k ) => {
			const msg = fields[ k ];
			if ( k === 'customer.name' || k === 'name' ) {
				out.name = msg;
			} else if ( k === 'customer.email' || k === 'email' ) {
				out.email = msg;
			} else if ( k === 'customer.phone' || k === 'phone' ) {
				out.phone = msg;
			} else if ( k === 'consent' ) {
				out.consent = msg;
			} else if ( k.indexOf( 'custom_fields.' ) === 0 ) {
				// The server keys these exactly as the renderer does, so a
				// server-only rule lands under its own input instead of in the
				// generic banner (D-R30).
				//
				// UNLESS this page has no such input: an admin can add a
				// required field while a visitor sits on the details step, and
				// that visitor's 422 then names a slug their form never
				// rendered. Attaching it to nothing would leave them
				// permanently and silently blocked — the Book button keeps
				// failing with no message anywhere. Those route to the banner
				// with a refresh hint instead (Codex review).
				if ( renderedCustomSlugs.has( k ) ) {
					out[ k ] = msg;
				} else {
					out.__stale = msg;
				}
			} else if (
				k === 'start_utc' ||
				k === 'service_id' ||
				k === 'X-Aponto-Idempotency'
			) {
				out.__slot = msg;
			}
		} );
		return out;
	}

	/** Land on the confirmation panel with an optional payment line. */
	function finishBooking( res, paymentLine ) {
		holdRef.current = null;
		setSubmitError( null );
		setSubmitting( false );
		setResponse( res );
		setPayResult( paymentLine || null );
		setPayIncomplete( null );
		setStep( 'confirmation' );
	}

	/**
	 * Remember the live hold so it can be handed back without waiting for the
	 * expiry cron, and persist the ORIGINAL response for a return leg.
	 *
	 * A REPLAY (`links_available:false`) deliberately carries no `manage_url`, so
	 * the token already captured is kept: a retry after an `unavailable` begin
	 * must not lose the only handle the widget has on its own hold.
	 *
	 * @param {Object}  res     Booking response.
	 * @param {?Object} payment The response's `payment` block.
	 */
	function rememberHold( res, payment ) {
		const booking = res.booking || {};
		const order = booking.order || {};
		const code = order.code || '';
		const previous = holdRef.current;
		// IN MEMORY: everything needed to hand the slot back, including the raw
		// manage token. It dies with the tab and is never written anywhere.
		holdRef.current = {
			orderCode: code,
			token:
				manageToken( res.manage_url ) ||
				( previous ? previous.token : '' ),
			expiresAt: payment ? payment.expires_at : null,
		};
		// IN sessionStorage: a WHITELIST, and only a whitelist.
		//
		// The first cut stored the booking response verbatim, which meant the
		// intent's client secret, the manage URL and the ICS URL — i.e. the
		// bearer capability to view and cancel the booking — sat in a store any
		// script on the page can read and any later visitor to that tab inherits.
		// None of that is needed: the return leg only has to render a minimal
		// confirmation and name the reference it is asking the SERVER about. So
		// what goes in is display facts plus references, nothing that grants
		// anything, and it is cleared the moment the payment settles.
		storeHold( code, {
			order_code: code,
			gateway: payment ? payment.gateway || '' : '',
			gateway_ref: payment ? payment.gateway_ref || '' : '',
			expires_at: payment ? payment.expires_at || null : null,
			booking: {
				status: booking.status || '',
				start_utc: booking.start_utc || '',
				end_utc: booking.end_utc || '',
				service_name: booking.service ? booking.service.name || '' : '',
				staff_name: booking.staff ? booking.staff.name || '' : '',
				display_tz: displayTz,
			},
		} );
	}

	/**
	 * Move the gateway step lock, in the ref and in state together.
	 *
	 * @param {boolean} flag Whether an attempt is in flight.
	 */
	function markGatewayBusy( flag ) {
		gatewayBusyRef.current = !! flag;
		setGatewayBusy( !! flag );
	}

	/**
	 * Give a held slot back immediately.
	 *
	 * D-R38k: an unpaid hold is not subject to `min_cancel_hours` — the customer
	 * never committed anything — so the moment they walk away from it (Back, or
	 * "pay on-site instead") the slot goes back on sale. The idempotency key is
	 * reset with it: the next POST is a NEW booking, not a retry of the cancelled
	 * one.
	 *
	 * REFUSED while a gateway has an attempt in flight (Codex r1 #5). "Unpaid" is
	 * a claim about this instant, and inside a live PayPal approval it is one the
	 * widget cannot make: the buyer may have approved seconds ago and the server
	 * may be capturing right now. Releasing there hands the slot to somebody else
	 * and charges this customer for it. The last line of defence rather than the
	 * first — every control that reaches here is disabled for the same span.
	 *
	 * @return {Promise<boolean>} Whether the slot was actually released.
	 */
	async function releaseHold() {
		if ( gatewayBusyRef.current ) {
			return false;
		}
		const hold = holdRef.current;
		if ( ! hold ) {
			return true;
		}
		holdRef.current = null;
		clearHold( hold.orderCode );
		idem.reset();
		if ( ! hold.token ) {
			return false;
		}
		try {
			await api.cancelBooking( hold.token );
			return true;
		} catch {
			// The hold outlives us either way — say so rather than pretending.
			setToast( {
				title: COPY.pay_hold_kept_title,
				body: hold.expiresAt
					? sprintf(
							COPY.pay_hold_kept,
							deadlineLabel( hold.expiresAt )
					  )
					: COPY.pay_hold_kept_generic,
			} );
			return false;
		}
	}

	/**
	 * Drop one gateway's adapter: out of the registry FIRST, then torn down.
	 *
	 * That order matters. `destroy()` releases the adapter's step lock, which
	 * calls back into the widget, and a callback that found the adapter still
	 * registered would be answering for an instance that no longer exists.
	 *
	 * @param {string} code Payment module code.
	 */
	function dropAdapter( code ) {
		const adapter = adaptersRef.current[ code ];
		if ( ! adapter ) {
			return;
		}
		delete adaptersRef.current[ code ];
		delete mountingRef.current[ code ];
		adapter.destroy();
	}

	/**
	 * Turn the gateway's answer into what the visitor sees.
	 *
	 * The widget NEVER decides that a payment succeeded: `succeeded` here means
	 * the gateway's own JS said so, and the only thing that follows from it is a
	 * call to `/confirm`, where the SERVER asks the gateway and applies the
	 * result (D-R38d). A confirm leg that fails to answer is therefore not a
	 * failure of the payment — the webhook is the second, independent leg — so it
	 * degrades to "processing", never to "not paid".
	 *
	 * @param {Object} out    Adapter result.
	 * @param {string} method The payment module code that produced it.
	 */
	async function applyPaymentOutcome( out, method ) {
		if ( out.status === 'validation' ) {
			setSubmitting( false );
			setPayError( out.message || COPY.pay_generic_error );
			return;
		}
		if ( out.status === 'unmounted' ) {
			// The gateway's own UI stopped being something the customer can pay
			// with — the SAME fact as a mount that never came up, so it gets the
			// same recovery rather than a dead sentence under dead buttons
			// (Codex r1 #16). The adapter is torn down and dropped from the
			// registry, which is what makes "Try again" MOUNT it again (a fresh
			// `mountNonce`) instead of re-running a booking POST nobody could
			// then pay for.
			setSubmitting( false );
			dropAdapter( method );
			setGatewayReady( false );
			setGatewayLoading( false );
			setPayError( '' );
			// Honest either way: before `createOrder` nothing exists, but a zoid
			// failure AFTER it leaves a real booking on a live hold, and telling
			// that customer "nothing has been booked" is simply false.
			const held = holdRef.current;
			setPayNotice( {
				title: gatewayUnavailableCopy( method ),
				body: held
					? holdBody( { expires_at: held.expiresAt } )
					: COPY.pay_ui_unavailable_body,
			} );
			return;
		}
		if ( out.status === 'cancelled' ) {
			// The customer closed the gateway's own window. NOTHING is lost —
			// the booking, its hold and the gateway's UI are all exactly as they
			// were — so this is a sentence, not a recovery flow.
			setSubmitting( false );
			setPayError( gatewayCancelledCopy( method ) );
			return;
		}
		if ( out.status === 'unavailable' ) {
			// The booking EXISTS and the hold is alive — only the intent failed.
			// Retrying reuses the same idempotency key, so the replay produces a
			// fresh begin attempt against the same hold (rest-contract §3.3).
			//
			// UNLESS the server said not to. `retryable: false` means the gateway
			// REFUSED this order's amount or currency (an amount with more
			// precision than the gateway's currency has, say), which is the same
			// answer every time — so the hold deadline, whose whole message is
			// "try again before this", is replaced by the honest sentence. The
			// field is additive and absent means retryable (QA run 2 BUG-3).
			const refused =
				!! out.payment && out.payment.retryable === false;
			setSubmitting( false );
			setPayNotice( {
				title: COPY.pay_begin_failed_title,
				body: refused
					? COPY.pay_begin_refused_body
					: holdBody( out.payment ),
				retry: ! refused,
			} );
			return;
		}
		if ( out.status === 'failed' ) {
			// Declines keep the hold AND the client secret: the customer retries
			// on the same intent rather than starting the whole booking again.
			setSubmitting( false );
			setPayError( out.message || COPY.pay_generic_error );
			return;
		}

		// A gateway whose approval callback has to KNOW the outcome — PayPal
		// cannot decide about `actions.restart()` without it — has already run
		// the confirm leg and hands the answer over. `undefined` means it did
		// not; `null` means it did and the server did not answer, which is a
		// different fact and must not be re-asked.
		let state = out.state;
		if ( state === undefined ) {
			try {
				state = await api.confirmPayment( method, out.ref );
			} catch {
				state = null;
			}
		}
		const status = state ? state.payment_status : 'pending';
		// `failure_code` is what separates "still moving" from "it did not work"
		// (rest-contract §3.8). An unsettled order that carries a reason has
		// FAILED, and reading it as "processing" is how a customer gets sent to a
		// confirmation panel for money that never arrived — with the hold thrown
		// away, so they cannot even retry.
		const failure = state ? String( state.failure_code || '' ) : '';
		const orderCode =
			( ( ( out.response || {} ).booking || {} ).order || {} ).code || '';
		// `unverified_amount` is the one code that is NOT a decline (§3.8): the
		// driver could not assert a figure it did not read back, and the payment
		// may perfectly well have gone through. It therefore takes the PENDING
		// path — booking made, nothing offered to retry — because inviting a
		// second payment is the worst possible answer to "we are not sure what
		// you were charged". The panel says so in its own words.
		const unverified = 'unverified_amount' === failure;

		if (
			status === 'paid' ||
			( status === 'pending' && ( ! failure || unverified ) )
		) {
			clearHold( orderCode );
			idem.reset();
			finishBooking( mergeBookingStatus( out.response, state ), {
				status: unverified ? 'unverified' : status,
				amountLabel: totalLabel,
				orderCode,
				// So the panel can say HOW they paid. A return leg has no method
				// to name (the whitelist carries none) and gets the neutral line.
				method,
			} );
			return;
		}

		if ( 'hold_released' === failure ) {
			// The server refused to capture because the hold was already gone
			// (rest-contract §3.8): the slot is back on sale, so retrying THIS
			// order is the one recovery that cannot work. Everything local to it
			// is dropped — the hold reference, the stored whitelist entry, the
			// idempotency key — and the panel offers a fresh booking instead of a
			// button that would fail the same way.
			setSubmitting( false );
			holdRef.current = null;
			clearHold( orderCode );
			idem.reset();
			setPayIncomplete( {
				orderCode,
				deadlineLabel: null,
				failureCopy: paymentFailureCopy( failure ),
				released: true,
				retryable: false,
			} );
			setStep( 'confirmation' );
			return;
		}

		if ( failure ) {
			// Keep EVERYTHING: the hold, its manage token, the mounted element
			// and its client secret. The customer retries the same intent on the
			// same booking — a fresh booking would strand the slot they hold.
			setSubmitting( false );
			setPayError( paymentFailureCopy( failure ) );
			return;
		}

		setSubmitting( false );
		setPayIncomplete( {
			orderCode,
			deadlineLabel: deadlineLabel( state ? state.expires_at : null ),
			retryable: true,
		} );
		setStep( 'confirmation' );
	}

	/** The hold-deadline sentence under a "couldn't start the payment" notice. */
	function holdBody( payment ) {
		const label = deadlineLabel( payment ? payment.expires_at : null );
		return label ? sprintf( COPY.pay_hold_until, label ) : COPY.pay_hold_generic;
	}

	/**
	 * Fold the confirm leg's authoritative booking status back into the original
	 * response, so the panel says "confirmed" when auto-confirm fired.
	 *
	 * @param {Object}  res   Original booking response.
	 * @param {?Object} state Confirm response.
	 * @return {Object} Response to render.
	 */
	function mergeBookingStatus( res, state ) {
		if ( ! state || ! state.booking_status ) {
			return res;
		}
		return Object.assign( {}, res, {
			booking: Object.assign( {}, res.booking, {
				status: state.booking_status,
			} ),
		} );
	}

	/**
	 * Run the paid path: the gateway validates, the server creates the booking
	 * AND the hold AND the intent, the gateway charges, the server confirms.
	 *
	 * The adapter owns the interleaving because only it knows what its gateway
	 * requires; the widget owns what happens either side of it.
	 *
	 * @param {Object} body  Request body.
	 * @param {string} key   Idempotency key.
	 * @param {Object} ctx   Retry context.
	 * @param {Object} draft The draft behind `body`.
	 */
	/**
	 * Create the booking + hold + intent, honouring the WAIT protocol.
	 *
	 * `payment.status: "pending"` (rest-contract §3.3) does not mean "no intent";
	 * it means "another request for this order is inside the gateway call right
	 * now, and its claim is still fresh — wait, do not start a second attempt".
	 * Treating it as a failure is how one hold ends up with TWO live intents on
	 * the gateway: a customer with two tabs open can then pay the one nobody is
	 * tracking. So we re-POST with the SAME idempotency key — a replay, not a new
	 * booking — until the other request has written its `gateway_ref`.
	 *
	 * The budget is bounded on all three axes (per-wait clamp, attempts, total
	 * elapsed) because the other request can also simply die: when the budget is
	 * spent we hand back the last `pending` block, the adapter reads it as "no
	 * usable intent", and the customer gets the manual retry / on-site notice
	 * instead of a spinner that never ends.
	 *
	 * @param {Object} body Request body.
	 * @param {string} key  Idempotency key — the SAME one for every attempt.
	 * @param {Object} ctx  Retry context.
	 * @return {Promise<{response: Object, payment: ?Object}>} The begin result.
	 */
	async function beginWithRetry( body, key, ctx ) {
		let waited = 0;
		for ( let attempt = 0; ; attempt++ ) {
			const res = await attemptBooking( body, key, ctx );
			if ( ! res.ok ) {
				throw HANDLED;
			}
			const payment = res.response.payment || null;
			rememberHold( res.response, payment );

			if ( ! payment || payment.status !== 'pending' ) {
				return { response: res.response, payment };
			}
			const delay = Math.min(
				Math.max( Number( payment.retry_after_ms ) || PAY_WAIT_MIN_MS, PAY_WAIT_MIN_MS ),
				PAY_WAIT_MAX_MS
			);
			if (
				attempt + 1 >= PAY_WAIT_ATTEMPTS ||
				waited + delay > PAY_WAIT_TOTAL_MS
			) {
				return { response: res.response, payment };
			}
			waited += delay;
			await new Promise( ( resolve ) => setTimeout( resolve, delay ) );
		}
	}

	async function runPayment( body, key, ctx, draft ) {
		const adapter = adaptersRef.current[ draft.payment_method ];
		if ( ! adapter ) {
			setSubmitting( false );
			setPayError( gatewayUnavailableCopy( draft.payment_method ) );
			return;
		}
		let out;
		try {
			out = await adapter.submit( {
				begin: () => beginWithRetry( body, key, ctx ),
				returnUrl: ( params ) =>
					buildReturnUrl(
						typeof window !== 'undefined' && window.location
							? window.location.href
							: '',
						params
					),
			} );
		} catch ( error ) {
			setSubmitting( false );
			if ( error !== HANDLED ) {
				// A throw from the gateway's own JS. Its text is written for an
				// integrator, so the visitor gets our copy instead.
				setPayError( COPY.pay_generic_error );
			}
			return;
		}
		await applyPaymentOutcome( out, draft.payment_method );
	}

	// --- The sequence for a gateway that owns the step's CTA. -----------------
	//
	// PayPal's popup opens from a click on PayPal's own iframe, so the sequence
	// starts inside the adapter rather than at `submit()`. These three callbacks
	// are the widget's half of it, and they are deliberately the SAME code paths
	// the Pay button drives: one booking POST, one confirm leg, one funnel for
	// every outcome. Nothing here is gateway-specific.

	/**
	 * Validate, mint the key and create the booking + hold + intent, because the
	 * gateway's own control was activated.
	 *
	 * Resolves `null` when the widget refused — invalid details, or a booking
	 * error whose recovery UI is already on screen. The adapter reads that as
	 * "do not open a checkout", and must not add a message of its own.
	 *
	 * @return {Promise<?{response: Object, payment: ?Object}>} The begin result.
	 */
	async function gatewayCheckout() {
		if ( submitting ) {
			return null;
		}
		// RESUME: the booking, its order and its intent all exist already, so
		// this leg has nothing to create — it hands back what the resume route
		// returned, which is the same `{response, payment}` a fresh begin
		// resolves. Two reasons it cannot fall through to the code below: there
		// are no details on this page to validate (they were taken when the
		// booking was made, and `validateDetails()` would bounce the visitor to a
		// step this flow never had), and a second POST would mint a second hold
		// nobody can pay for. The SERVER still claims the attempt exactly as it
		// does for a first one — the resume route goes through
		// `PaymentService::beginPayment()`, so the reuse rule, the attempt budget
		// and the per-order lock all apply unchanged.
		if ( resumeRef.current ) {
			setPayError( '' );
			setPayNotice( null );
			setSubmitting( true );
			return resumeRef.current;
		}
		const errors = validateDetails();
		if ( errors ) {
			// The fields are not on this step, so showing the errors means going
			// back to the step that owns them.
			setFieldErrors( errors );
			markNav();
			setStep( 'details' );
			return null;
		}
		if ( honeypot ) {
			setSubmitError( { kind: 'guard' } );
			return null;
		}
		setFieldErrors( null );
		setSubmitError( null );
		setPayError( '' );
		setPayNotice( null );
		setSubmitting( true );

		const draft = buildDraft();
		const key = idem.keyFor( draft );
		const ctx = {
			lockRetried: false,
			inflightTries: 0,
			conflictRetried: false,
			draft,
		};
		try {
			return await beginWithRetry( buildBody( draft ), key, ctx );
		} catch ( error ) {
			setSubmitting( false );
			if ( error !== HANDLED ) {
				setPayError( COPY.pay_generic_error );
			}
			return null;
		}
	}

	/**
	 * Ask the SERVER what one gateway reference actually did (rest-contract §3.8).
	 *
	 * Never throws: a confirm leg that cannot answer is not evidence that the
	 * money failed — the webhook is the second, independent leg — so `null` means
	 * "unknown", and {@link applyPaymentOutcome} degrades it to "processing".
	 *
	 * @param {string} method Payment module code.
	 * @param {string} ref    Gateway payment reference.
	 * @return {Promise<?Object>} Confirm state, or null.
	 */
	async function gatewayConfirm( method, ref ) {
		try {
			return await api.confirmPayment( method, ref );
		} catch {
			return null;
		}
	}

	/** The "Try again" on a payment notice, which means three different things. */
	function retryPayment() {
		if ( gatewayBusyRef.current ) {
			// A gateway with an attempt in flight has nothing to retry, and the
			// mount path below would tear its buttons out from under a buyer who
			// has the popup open.
			return;
		}
		setPayError( '' );
		setPayNotice( null );
		const adapter =
			payMethod && payMethod !== ONSITE
				? adaptersRef.current[ payMethod ]
				: null;
		if ( ! adapter ) {
			// The gateway never came up. Retrying means MOUNTING it again — there
			// is no payment UI to submit through, so re-running the booking POST
			// would only produce a second hold nobody can pay for.
			setMountNonce( ( n ) => n + 1 );
			return;
		}
		if ( adapter.ownsCta ) {
			// PayPal: its buttons are still on the step and are the only thing
			// that can start the sequence. Clearing the banner is the whole of
			// "try again" here — pressing anything of ours would do nothing.
			return;
		}
		submit();
	}

	/**
	 * Pay an EXISTING hold: the same adapter sequence, with `begin()` resolving
	 * what the server already handed us instead of creating anything.
	 *
	 * That is the whole difference. Everything after it — the decline copy, the
	 * confirm leg, the failure-code rule — is the code the in-tab flow runs, so
	 * a resumed payment cannot drift from a fresh one.
	 */
	async function runResumePayment() {
		const adapter = adaptersRef.current[ payMethod ];
		const stored = resumeRef.current;
		if ( ! adapter || ! stored ) {
			setSubmitting( false );
			setPayError( COPY.pay_ui_unavailable );
			return;
		}
		let out;
		try {
			out = await adapter.submit( {
				begin: async () => stored,
				returnUrl: ( params ) =>
					buildReturnUrl(
						typeof window !== 'undefined' && window.location
							? window.location.href
							: '',
						params
					),
			} );
		} catch {
			setSubmitting( false );
			setPayError( COPY.pay_generic_error );
			return;
		}
		await applyPaymentOutcome( out, payMethod );
	}

	function submit() {
		if ( submitting ) {
			return;
		}
		markNav();
		// RESUME: the booking already exists and so does its intent. There is no
		// draft to validate (the details were taken when it was made) and no POST
		// to send — the sequence starts at `confirmPayment`.
		if ( resumeRef.current ) {
			setPayError( '' );
			setPayNotice( null );
			setSubmitting( true );
			runResumePayment();
			return;
		}
		// Re-validated even on the Payment step, where these fields passed on the
		// way in: nothing stops a visitor going Back and clearing one.
		const errors = validateDetails();
		if ( errors ) {
			setFieldErrors( errors );
			if ( step === 'payment' ) {
				setStep( 'details' );
			}
			return;
		}
		if ( honeypot ) {
			// Bot filled the offscreen field — refuse quietly with the guard message.
			setSubmitError( { kind: 'guard' } );
			return;
		}
		setFieldErrors( null );
		setSubmitError( null );
		setPayError( '' );
		setPayNotice( null );
		setSubmitting( true );
		const draft = buildDraft();
		const key = idem.keyFor( draft );
		const ctx = {
			lockRetried: false,
			inflightTries: 0,
			conflictRetried: false,
			draft,
		};
		const body = buildBody( draft );
		if ( draft.payment_method ) {
			runPayment( body, key, ctx, draft );
			return;
		}
		attemptBooking( body, key, ctx ).then( ( out ) => {
			if ( out.ok ) {
				finishBooking( out.response, null );
			}
		} );
	}

	// --- Gateway lifecycle. ---------------------------------------------------

	/**
	 * Own the gateway UI for as long as the Payment step is on screen.
	 *
	 * The mount node is NOT in this tree (see the file header), so the lifecycle
	 * has to be explicit. Three rules, all measured in the spike:
	 *
	 *  - One adapter per gateway the visitor has actually selected, kept alive
	 *    while the step is. Switching card → on-site → card must not reload the
	 *    iframe, because a reloaded Payment Element loses what was typed into it.
	 *  - Visibility is toggled on the adapter's own holder. Hiding the shadow
	 *    panel does not hide slotted content.
	 *  - Leaving the step destroys every adapter — element first, then holder.
	 *
	 * A mount that fails (no Stripe.js, or the element never becomes ready) drops
	 * the adapter again so the next selection retries instead of sitting on a
	 * corpse.
	 */

	// Refreshed after EVERY render, before any click can reach a gateway button:
	// the adapter is mounted once and must not be re-created to pick up new state,
	// so what it holds is a stable indirection rather than a closure.
	useEffect( () => {
		gatewayFlowRef.current = {
			checkout: gatewayCheckout,
			confirm: gatewayConfirm,
			settle: applyPaymentOutcome,
		};
		// The BACKSTOP for {@link selectMethod}: a selection that changed by some
		// other route still lands here, one render later.
		selectedMethodRef.current = payMethod;
	} );

	/**
	 * Which gateway's UI is on screen — a LAYOUT effect, so it lands with the commit.
	 *
	 * The holder is not in this tree (see the file header), so nothing about the render puts it in
	 * front of the visitor; only this call does. As a passive effect it ran a frame LATER than the
	 * commit that moved the selection, which left a gap in which the method's panel, its radio and
	 * its note all said "card" while the card field itself was still `display: none`. Focus does
	 * not enter a hidden field: a keyboard visitor who moved back onto the method and started
	 * typing inside that gap typed into the radio group instead, and the Pay button never armed
	 * because the element never saw a keystroke. Measured at 2–7 ms here, and preact falls back to
	 * a 100 ms timer whenever the frame callback does not run (a background tab).
	 *
	 * Only VISIBILITY belongs here. Mounting is asynchronous and stays in the passive effect below,
	 * which shows a newly mounted gateway itself once it is ready.
	 */
	useLayoutEffect( () => {
		const mounted = adaptersRef.current;
		Object.keys( mounted ).forEach( ( code ) =>
			mounted[ code ].setVisible( step === 'payment' && code === payMethod )
		);
	}, [ step, payMethod ] );

	useEffect( () => {
		const mounted = adaptersRef.current;

		if ( step !== 'payment' ) {
			Object.keys( mounted ).forEach( ( code ) => {
				mounted[ code ].destroy();
				delete mounted[ code ];
			} );
			mountingRef.current = {};
			markGatewayBusy( false );
			setGatewayLoading( false );
			return undefined;
		}

		// EVERY branch states the loading flag for the method that is selected
		// NOW, rather than leaving whatever the last mount set. On-site takes no
		// gateway UI at all, and an adapter that is registered and settled is
		// finished coming up.
		if ( ! payMethod || payMethod === ONSITE || ! service ) {
			setGatewayLoading( false );
			return undefined;
		}
		if ( mounted[ payMethod ] ) {
			setGatewayLoading( !! mountingRef.current[ payMethod ] );
			setGatewayReady( mounted[ payMethod ].isComplete() );
			return undefined;
		}

		const gateway = gateways.find( ( g ) => g.code === payMethod );
		const host = widgetHost( wrapRef.current );
		if ( ! gateway || ! host ) {
			return undefined;
		}

		const adapter = createGatewayAdapter( gateway, gateways );
		mounted[ gateway.code ] = adapter;
		mountingRef.current[ gateway.code ] = true;
		setGatewayReady( false );
		setGatewayLoading( true );

		// The ONE question every settle asks — the one-shot mount settle below and
		// the adapter's long-lived callbacks alike — and it is asked of the
		// PRESENT: is this still the registry's adapter for its gateway, and is
		// that gateway still the selected method. Both halves are needed and both
		// are sufficient. Registry identity alone let a PayPal render that
		// resolved after the buyer chose Stripe call `setVisible(true)` on itself
		// (Codex r1 #17); `selectedMethodRef` is what refuses it, and it moves
		// with the click, so no settle can read it stale.
		//
		// NOT a per-mount generation token, which is what r1 #17 first used. That
		// token counted SELECTIONS, so card → on-site → card retired a mount that
		// was still the current one: a Payment Element becoming ready after that
		// toggle dropped ITSELF, and nothing re-mounted it (the mount effect's
		// deps had not changed), leaving an empty card panel under a permanently
		// disabled Pay button. The real Element needs hundreds of milliseconds to
		// become ready, so a visitor comparing the two methods is well inside the
		// window. Adapter identity already says everything a generation could: a
		// superseded mount is one whose adapter is no longer the registered one.
		const live = () =>
			adaptersRef.current[ gateway.code ] === adapter &&
			selectedMethodRef.current === gateway.code;
		/** Unregister this adapter (if it is still the registered one) and tear it down. */
		const drop = () => {
			if ( adaptersRef.current[ gateway.code ] === adapter ) {
				delete adaptersRef.current[ gateway.code ];
			}
			adapter.destroy();
		};
		adapter
			.mount( {
				host,
				scope: wrapRef.current,
				// The widget's half of the sequence, for a gateway that starts it
				// from its own control. Read through the ref on every call so a
				// button rendered once still reaches the current state.
				flow: {
					checkout: () => gatewayFlowRef.current.checkout(),
					confirm: ( ref ) =>
						gatewayFlowRef.current.confirm( gateway.code, ref ),
					settle: ( out ) =>
						gatewayFlowRef.current.settle( out, gateway.code ),
				},
				// MINOR units plus the ISO exponent: only the adapter knows its own
				// gateway's exponent, so only the adapter can do the conversion
				// (D-R39a). It refuses to mount rather than quote a rounded figure.
				amountMinor: Number( service.price_minor ) || 0,
				currency: service.currency,
				currencyExponent,
				onChange: ( complete ) => {
					if ( live() ) {
						setGatewayReady( complete );
					}
				},
				// The step lock. NOT guarded by `live()`: an adapter releasing the
				// lock on its way out has to be heard whatever else has changed,
				// or the step stays frozen with nothing left to unfreeze it.
				onBusy: ( flag ) => {
					if ( flag && ! live() ) {
						return;
					}
					markGatewayBusy( flag );
				},
			} )
			.then(
				() => {
					// This code has finished coming up whoever is selected now —
					// the flag is per gateway precisely so a superseded settle can
					// record that without touching a line that is about somebody
					// else's panel.
					delete mountingRef.current[ gateway.code ];
					if ( ! live() ) {
						// The visitor moved on while this gateway was still coming
						// up. Showing it now would put a second gateway's UI under
						// the selected one — and leave a live button that would
						// check out against a method nobody is looking at. Dropping
						// it is also what makes coming BACK to this method mount it
						// again, since the registry no longer holds it.
						drop();
						return;
					}
					setGatewayLoading( false );
					adapter.setVisible( true );
				},
				() => {
					delete mountingRef.current[ gateway.code ];
					const stale = ! live();
					drop();
					if ( stale ) {
						return;
					}
					setGatewayLoading( false );
					// A BANNER, not a bare sentence: a gateway that never came up
					// left the customer with a dead step and no way back onto it
					// — the notice carries the "Try again" that re-mounts it, and
					// the on-site escape hatch where the site allows one.
					setPayNotice( {
						title: gatewayUnavailableCopy( gateway.code ),
						body: COPY.pay_ui_unavailable_body,
					} );
				}
			);

		return undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ step, payMethod, service, gateways, mountNonce ] );

	/**
	 * Push a changed total or a changed skin into a MOUNTED gateway rather than
	 * remounting it: the amount is display-only (the server charges the order),
	 * and the appearance is resolved from the widget's own tokens, which a block
	 * attribute can change live in the editor.
	 */
	useEffect( () => {
		const adapter = payMethod ? adaptersRef.current[ payMethod ] : null;
		if ( ! adapter || ! service ) {
			return;
		}
		adapter.update( {
			amountMinor: Number( service.price_minor ) || 0,
			currencyExponent,
			scope: wrapRef.current,
		} );
	}, [ payMethod, service, config.appearance, currencyExponent ] );

	/**
	 * The gateway RETURN leg.
	 *
	 * V1 pins Stripe to `allow_redirects: never`, so this path should never run
	 * — but "should never" is not "cannot", and a payment that comes back to a
	 * page with no handler is a customer who has paid and been shown a booking
	 * form. It runs once, strips the params so a reload cannot replay it, and
	 * asks the server (never the URL) what the payment actually did.
	 */
	/**
	 * The RESUME leg: turn a token in the URL into a mounted Payment step.
	 *
	 * One request answers everything this page needs and it is the SERVER that
	 * decides, not the link: whether this hold is still payable, which gateway
	 * owns it, and what the appointment says. A dead link therefore explains
	 * itself ("already paid", "expired") instead of rendering a payment form for
	 * a slot somebody else now has.
	 *
	 * The manage token is kept in `holdRef` exactly as the in-tab flow keeps it,
	 * so Back and "pay on-site instead" release the hold here too — the token is
	 * known, which was the whole problem with resuming from `sessionStorage`.
	 */
	const resumeHandled = useRef( false );
	// The last resume runner, so the busy banner's Retry can re-send the request
	// without re-running an effect whose only trigger — the token in the URL —
	// was deliberately erased on the first pass.
	const resumeRetryRef = useRef( null );
	useEffect( () => {
		if ( ! resumeToken || resumeHandled.current ) {
			return;
		}
		resumeHandled.current = true;
		// Strip it immediately: a manage token in the address bar outlives the
		// tab in history and in whatever the visitor pastes to somebody else.
		stripReturn( typeof window !== 'undefined' ? window : null );

		/**
		 * Ask the resume route, waiting out a CONCURRENT begin the same way the booking route does
		 * (D-R39c, Codex A.7).
		 *
		 * `pending` is not a failure: it means another tab — or this one, a moment ago — is inside
		 * the gateway call, and the reference will be on the row a few hundred milliseconds later.
		 * Treating it as terminal showed "that payment link has expired" to somebody whose hold was
		 * alive and whose intent was being created as they read it.
		 *
		 * @return {Promise<Object>} The resume payload.
		 */
		async function resumeWithRetry() {
			let waited = 0;
			let attempt = 0;
			let busy = 0;
			for ( ;; ) {
				let data;
				try {
					// eslint-disable-next-line no-await-in-loop
					data = await api.resumePayment( resumeToken );
				} catch ( raw ) {
					// A BUSY ORDER IS NOT A DEAD LINK (D-R39c round 2, Codex
					// NEW-4). `503` here means another writer holds this order's
					// per-order lock for the moment — a webhook settling a
					// sibling event, the expiry cron, the customer's other tab.
					// It used to fall through to the rejection handler and put
					// "this payment link has expired" in front of somebody whose
					// slot was still held, which is both false and unrecoverable:
					// the token was already stripped from the URL, so "book
					// again" was the only door left. Retried a bounded number of
					// times, and then reported as the retryable thing it is.
					if (
						classifyError( raw ).kind !== 'lock_timeout' ||
						busy + 1 >= RESUME_BUSY_ATTEMPTS
					) {
						throw raw;
					}
					const wait = busyRetryDelay( raw, busy );
					busy += 1;
					// eslint-disable-next-line no-await-in-loop
					await new Promise( ( resolve ) =>
						setTimeout( resolve, wait )
					);
					continue;
				}

				const block = data.payment || null;
				if ( ! block || block.status !== 'pending' ) {
					return data;
				}
				const delay = Math.min(
					Math.max( Number( block.retry_after_ms ) || PAY_WAIT_MIN_MS, PAY_WAIT_MIN_MS ),
					PAY_WAIT_MAX_MS
				);
				attempt += 1;
				if ( attempt >= PAY_WAIT_ATTEMPTS || waited + delay > PAY_WAIT_TOTAL_MS ) {
					return data;
				}
				waited += delay;
				// eslint-disable-next-line no-await-in-loop
				await new Promise( ( resolve ) => setTimeout( resolve, delay ) );
			}
		}

		/**
		 * One whole resume attempt: the request ladder above, then the two
		 * outcomes. Kept in a ref so the busy banner's Retry button can run it
		 * again — the effect itself is one-shot on purpose (the token is stripped
		 * from the URL on the first pass), so a second run has to be asked for.
		 */
		function runResume() {
			resumeWithRetry().then(
				( data ) => {
					const booking = data.booking || {};
					const order = data.order || {};
					const payment = data.payment || null;
					if ( ! payment || payment.status !== 'begin' ) {
						// `hold_expired` is the one refusal with its own words: the slot's clock ran out,
						// so there is nothing to retry and inviting one would be a lie.
						setResumeError( {
							reason: payment && payment.failure_code === 'hold_expired' ? 'expired' : 'unavailable',
						} );
						return;
					}

					const minutes = Math.max(
						0,
						Math.round(
							( new Date( booking.end_utc ).getTime() -
								new Date( booking.start_utc ).getTime() ) /
								60000
						)
					);
					// A service DTO shaped like the catalogue's, so the summary, the
					// total and the adapter all work unchanged — the page simply
					// never loaded a catalogue to find it in.
					setService( {
						id: ( booking.service || {} ).id || 0,
						name: ( booking.service || {} ).name || '',
						description: '',
						duration_minutes: minutes,
						price_minor: Number( order.total_minor ) || 0,
						currency: order.currency || '',
						category: null,
					} );
					if ( booking.display_timezone ) {
						setDisplayTz( canonicalizeZone( booking.display_timezone ) );
					}
					setSelectedSlotUtc( booking.start_utc || null );
					setPayMethod( data.gateway );
					holdRef.current = {
						orderCode: data.order_code,
						token: resumeToken,
						expiresAt: data.expires_at,
					};
					resumeRef.current = {
						payment,
						response: {
							booking: {
								id: 0,
								status: booking.status || 'pending',
								start_utc: booking.start_utc,
								end_utc: booking.end_utc,
								service: booking.service || {},
								staff: booking.staff || {},
								order: { code: data.order_code },
							},
							// The manage link and the calendar file were emailed when
							// the booking was made; this response carries neither, and
							// the confirmation says so rather than inventing them.
							links_available: false,
						},
					};
					setResume( data );
					setStep( 'payment' );
				},
				( raw ) => {
					const info = classifyError( raw );
					setResumeError( {
						reason:
							info.code === 'aponto_payment_state'
								? 'state'
								: info.kind,
						paymentStatus:
							raw && raw.data ? raw.data.payment_status : '',
					} );
				}
			);
		}

		resumeRetryRef.current = runResume;
		runResume();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ resumeToken ] );

	const returnHandled = useRef( false );
	useEffect( () => {
		if ( ! returnLeg || returnHandled.current ) {
			return;
		}
		returnHandled.current = true;
		stripReturn( typeof window !== 'undefined' ? window : null );

		// The whitelist from `rememberHold` — display facts and references, no
		// capability of any kind (F5). It is therefore NOT enough to rebuild the
		// full confirmation panel, and deliberately so: this leg renders the
		// minimal one and points the customer at the manage link in their email.
		const stored = readHold( returnLeg.order );
		clearHold( returnLeg.order );
		const details = stored && stored.booking ? stored.booking : null;

		if ( returnLeg.status === 'cancel' ) {
			setPayIncomplete( {
				orderCode: returnLeg.order,
				deadlineLabel: deadlineLabel( stored ? stored.expires_at : null ),
				retryable: false,
			} );
			return;
		}

		const code =
			( stored && stored.gateway ) ||
			( gateways.length ? gateways[ 0 ].code : '' );
		if ( ! code || ! returnLeg.ref ) {
			setMinimalConfirm( { confirmed: false, details } );
			return;
		}

		api.confirmPayment( code, returnLeg.ref ).then(
			( state ) => {
				const status = state.payment_status;
				// Same rule as the in-widget leg (F3): a reason means it failed.
				const failure = String( state.failure_code || '' );
				if (
					status !== 'paid' &&
					( status !== 'pending' || failure )
				) {
					setPayIncomplete( {
						orderCode: returnLeg.order,
						deadlineLabel: deadlineLabel( state.expires_at ),
						failureCopy: failure
							? paymentFailureCopy( failure )
							: '',
						// Same rule as the in-widget leg: a hold that is already
						// gone must not be described as still running.
						released: 'hold_released' === failure,
						retryable: false,
					} );
					return;
				}
				setPayResult( {
					status,
					// No amount survives the whitelist, and the confirm route
					// never carried one — so the line says what is known.
					amountLabel: '',
					orderCode: state.order_code || returnLeg.order,
				} );
				setMinimalConfirm( {
					confirmed: state.booking_status === 'confirmed',
					details,
				} );
			},
			() => {
				// The money may well have arrived; the webhook leg settles it
				// either way. Never tell the customer it did not.
				setPayResult( {
					status: 'pending',
					amountLabel: '',
					orderCode: returnLeg.order,
				} );
				setMinimalConfirm( { confirmed: false, details } );
			}
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ returnLeg ] );

	// --- Navigation. ----------------------------------------------------------
	function selectService( s ) {
		markNav();
		autoPickedRef.current = false;
		setService( s );
		setSelectedDayKey( null );
		setSelectedSlotUtc( null );
		setAvail( { loading: true, error: false, index: {}, maxSlots: 1 } );
		setStep( 'datetime' );
	}

	function goToDetails() {
		markNav();
		// Create the idempotency key on entering the step that owns the FINAL CTA
		// — Details when there is no Payment step, Payment when there is. Minting
		// it a step early would only rotate it again the moment a method is
		// chosen, since the method is part of the draft the key is bound to.
		if ( ! paymentStepExists ) {
			idem.keyFor( buildDraft() );
		}
		setStep( 'details' );
	}

	/** The method a freshly entered Payment step starts on. */
	function defaultMethod() {
		if ( payMethod && methodIsValid( payMethod ) ) {
			return payMethod;
		}
		return gateways.length ? gateways[ 0 ].code : ONSITE;
	}

	/**
	 * Whether a method is still selectable in the current configuration —
	 * on-site only when the site allows it, a gateway only when it is offered.
	 *
	 * @param {string} method Method key.
	 * @return {boolean} Validity.
	 */
	function methodIsValid( method ) {
		if ( method === ONSITE ) {
			return payments.mode === 'optional';
		}
		return gateways.some( ( g ) => g.code === method );
	}

	/** Details → Payment: validate first, then mint the key for the real CTA. */
	function goToPayment() {
		markNav();
		const errors = validateDetails();
		if ( errors ) {
			setFieldErrors( errors );
			return;
		}
		setFieldErrors( null );
		setSubmitError( null );
		setPayError( '' );
		setPayNotice( null );
		const method = defaultMethod();
		selectMethod( method );
		idem.keyFor( buildDraft( method ) );
		setStep( 'payment' );
	}

	/**
	 * Move the payment selection, in the ref and in state together.
	 *
	 * The ref half is what every gateway settle reads (see
	 * {@link selectedMethodRef}) and it has to move with the click rather than
	 * one render later: a mount resolving inside that gap would unhide a gateway
	 * the visitor has just left.
	 *
	 * @param {?string} method Method key, or null for "nothing selected".
	 */
	function selectMethod( method ) {
		selectedMethodRef.current = method;
		setPayMethod( method );
	}

	/**
	 * Switch payment method.
	 *
	 * Two things have to happen together, and neither is optional: a hold created
	 * for the previous method is released (nothing should hold a slot for a
	 * payment that is no longer going to be made), and the idempotency key is
	 * re-derived — the method is part of the draft the server fingerprints, so
	 * keeping the old key would answer `409 aponto_idempotency_conflict`.
	 *
	 * @param {string} method Method key.
	 */
	function choosePayMethod( method ) {
		if ( method === payMethod ) {
			return;
		}
		if ( gatewayBusyRef.current ) {
			// The radios and "Pay on-site instead" are already disabled for this
			// span (D-R40, Codex r1 #5); this is the guard for anything that
			// reaches the handler anyway, because the release below would hand
			// away a slot the gateway may be capturing against right now.
			return;
		}
		setPayError( '' );
		setPayNotice( null );
		selectMethod( method );
		// Fire-and-forget: the release resets the key, and the new key is minted
		// after it so the ordering cannot invert.
		releaseHold().then( () => {
			idem.keyFor( buildDraft( method ) );
		} );
	}

	// User-driven Back / Change-service transitions. Each marks navigation so the
	// destination step's heading takes focus (never on the initial paint).
	function backToService() {
		markNav();
		releaseHold();
		setStep( 'service' );
	}

	function backToDateTime() {
		markNav();
		releaseHold();
		setStep( 'datetime' );
	}

	/** Payment → Details. The draft survives; the hold does not. */
	function backToDetails() {
		if ( gatewayBusyRef.current ) {
			// Back is disabled while a gateway owns an attempt; this is the guard
			// for a keyboard or programmatic activation that gets past that.
			return;
		}
		markNav();
		releaseHold();
		setPayError( '' );
		setPayNotice( null );
		setStep( 'details' );
	}

	function changeService() {
		markNav();
		releaseHold();
		autoPickedRef.current = false;
		setService( null );
		setStep( 'service' );
	}

	function bookAnother() {
		markNav();
		idem.reset();
		holdRef.current = null;
		selectMethod( null );
		setPayError( '' );
		setPayNotice( null );
		setPayResult( null );
		setPayIncomplete( null );
		setMinimalConfirm( null );
		setGatewayReady( false );
		markGatewayBusy( false );
		setResponse( null );
		setDetails( { name: '', email: '', phone: '', note: '' } );
		setConsent( false );
		setCustomValues( {} );
		setHoneypot( '' );
		setFieldErrors( null );
		setSubmitError( null );
		setSelectedDayKey( null );
		setSelectedSlotUtc( null );
		autoPickedRef.current = false;
		// Preselected or single-service: there is no Service step to return to, so
		// the service has to be re-resolved rather than cleared. It is normally
		// still in state — but not after a gateway RETURN leg, where the catalogue
		// deliberately did not auto-advance, and clearing it there would strand the
		// visitor on a step the fraction does not even count.
		const only = serviceLocked
			? service ||
			  ( preselectedId
					? catalogue.services.find( ( s ) => s.id === preselectedId )
					: null ) ||
			  ( catalogue.services.length === 1
					? catalogue.services[ 0 ]
					: null )
			: null;
		if ( only ) {
			// The auto-pick effect re-selects the first available day.
			setService( only );
			setStep( 'datetime' );
		} else {
			setService( null );
			setStep( 'service' );
		}
	}

	// --- Derived layout data. -------------------------------------------------
	// Honest numbering: the Payment step is IN the list only when this booking
	// actually has one, so a free service on a paying site reads `01 / 04` and a
	// paid one `01 / 05` — and a preselected service drops one from either.
	const stepList = [];
	if ( ! serviceLocked ) {
		stepList.push( 'service' );
	}
	stepList.push( 'datetime', 'details' );
	if ( paymentStepExists ) {
		stepList.push( 'payment' );
	}
	stepList.push( 'confirmation' );
	const stepCount = stepList.length;
	const stepIndex = stepList.indexOf( step ) + 1;
	const hasSummary =
		( step === 'datetime' || step === 'details' || step === 'payment' ) &&
		!! service;
	const years = useMemo( () => {
		const y = initialYear;
		return [ y, y + 1 ];
	}, [ initialYear ] );

	const alternativesExist = catalogue.services.length > 1;

	const submitBanner = useMemo( () => {
		if ( ! submitError ) {
			return null;
		}
		switch ( submitError.kind ) {
			case 'rate_limited':
				return (
					<Banner
						variant="warn"
						title={ COPY.rate_limited_title }
						body={ sprintf( COPY.rate_limited_body, rateSeconds ) }
					/>
				);
			case 'lock_timeout':
				return (
					<Banner
						variant="err"
						title={ COPY.lock_timeout_title }
						body={ COPY.lock_timeout_body }
					/>
				);
			case 'in_flight':
			case 'in_flight_manual':
				return (
					<Banner
						variant="clock"
						title={ COPY.in_flight_title }
						body={ COPY.in_flight_body }
					/>
				);
			case 'guard':
				return (
					<Banner
						variant="err"
						title={ COPY.guard_title }
						body={ COPY.guard_body }
					/>
				);
			case 'validation_general':
				return (
					<Banner
						variant="err"
						title={ COPY.validation_general_title }
						body={ submitError.message || COPY.validation_general_body }
					/>
				);
			case 'validation_stale':
				return (
					<Banner
						variant="err"
						title={ COPY.validation_general_title }
						body={
							submitError.message
								? submitError.message + ' ' + COPY.stale_form_hint
								: COPY.stale_form_hint
						}
					/>
				);
			default:
				return (
					<Banner
						variant="err"
						title={ COPY.load_availability_err }
						body={ COPY.load_retry_sub }
					/>
				);
		}
	}, [ submitError, rateSeconds ] );

	const submitBlocked =
		submitting ||
		( submitError && submitError.kind === 'rate_limited' && rateSeconds > 0 );

	// --- Render. --------------------------------------------------------------
	function renderStep() {
		if ( step === 'service' ) {
			if ( catalogue.loading ) {
				return <ServiceSkeleton />;
			}
			if ( catalogue.error ) {
				return (
					<div>
						<Banner
							variant="err"
							title={ COPY.load_services_err }
							body={ COPY.load_retry_sub }
						/>
						<div class="ap-foot">
							<span />
							<button
								type="button"
								class="ap-primary"
								onClick={ loadCatalogue }
							>
								{ COPY.try_again }
							</button>
						</div>
					</div>
				);
			}
			return (
				<ServiceStep
					services={ catalogue.services }
					categories={ catalogue.categories }
					locale={ config.locale }
					currencyExponent={ currencyExponent }
					selectedId={ service ? service.id : null }
					stepIndex={ stepIndex }
					stepCount={ stepCount }
					focusOnMount={ navigatedRef.current }
					onSelect={ selectService }
				/>
			);
		}

		if ( step === 'datetime' && service ) {
			return (
				<DateTimeStep
					service={ service }
					locale={ config.locale }
					currencyExponent={ currencyExponent }
					displayTz={ displayTz }
					businessTz={ businessTz }
					showSelector={ showSelector }
					tzOptions={ tzOptions }
					calYear={ cal.year }
					calMonth={ cal.month }
					onMonth={ ( year, month ) => {
						setSelectedDayKey( null );
						setSelectedSlotUtc( null );
						setCal( { year, month } );
					} }
					availabilityIndex={ avail.index }
					maxSlots={ avail.maxSlots }
					availLoading={ avail.loading }
					availError={ avail.error }
					onRetryAvail={ () =>
						fetchAvailability( cal.year, cal.month, displayTz )
					}
					todayKey={ dayKeyInTz( Date.now(), displayTz ) }
					years={ years }
					selectedDayKey={ selectedDayKey }
					onSelectDay={ ( key ) => {
						setSelectedDayKey( key );
						setSelectedSlotUtc( null );
					} }
					selectedSlotUtc={ selectedSlotUtc }
					onSelectSlot={ setSelectedSlotUtc }
					onChangeDisplayTz={ ( tz ) => {
						// Changing the display zone regroups slots by a new calendar
						// day, so the previously selected day key may no longer be
						// valid — reset it (and the slot) so the visitor re-picks a
						// day in the new zone.
						setSelectedDayKey( null );
						setSelectedSlotUtc( null );
						setDisplayTz( tz );
					} }
					stepIndex={ stepIndex }
					stepCount={ stepCount }
					focusOnMount={ navigatedRef.current }
					onBack={ serviceLocked ? null : backToService }
					onContinue={ goToDetails }
					onChangeService={
						serviceLocked && alternativesExist
							? changeService
							: null
					}
				/>
			);
		}

		if ( step === 'details' ) {
			return (
				<DetailsStep
					details={ details }
					onChange={ ( field, value ) =>
						setDetails( ( d ) =>
							Object.assign( {}, d, { [ field ]: value } )
						)
					}
					phoneMode={ phoneMode }
					consentEnabled={ consentEnabled }
					consentText={ config.fields.consent.text }
					consent={ consent }
					onConsentChange={ setConsent }
					customFields={ customFields }
					customValues={ customValues }
					onCustomChange={ ( slug, value ) =>
						setCustomValues( ( v ) =>
							Object.assign( {}, v, { [ slug ]: value } )
						)
					}
					honeypot={ honeypot }
					onHoneypot={ setHoneypot }
					fieldErrors={ fieldErrors }
					banner={ submitBanner }
					stepIndex={ stepIndex }
					stepCount={ stepCount }
					focusOnMount={ navigatedRef.current }
					onBack={ backToDateTime }
					onSubmit={ paymentStepExists ? goToPayment : submit }
					primaryLabel={
						paymentStepExists ? COPY.continue : COPY.book
					}
					submitting={ submitBlocked }
				/>
			);
		}

		// A resume that cannot proceed replaces the whole flow: there is no draft
		// behind it and no step to fall back to.
		if ( resumeError ) {
			const paid = [ 'paid', 'partial', 'refunded' ].includes(
				resumeError.paymentStatus
			);
			// `lock_timeout` survived the bounded retry above, so it is the one
			// resume refusal that is TEMPORARY: the hold is alive and the answer
			// is "try that again", not "book again" (Codex NEW-4).
			const busy = resumeError.reason === 'lock_timeout';
			return (
				<ResumeUnavailable
					paid={ paid }
					busy={ busy }
					onRetry={ () => {
						setResumeError( null );
						if ( resumeRetryRef.current ) {
							resumeRetryRef.current();
						}
					} }
					bookAgainUrl={
						typeof window !== 'undefined' && window.location
							? window.location.pathname
							: ''
					}
					focusOnMount={ true }
				/>
			);
		}

		if ( step === 'payment' && service ) {
			return (
				<PaymentStep
					gateways={ gateways }
					mode={ payments.mode }
					method={ payMethod }
					onMethod={ choosePayMethod }
					totalLabel={ totalLabel }
					gatewayLoading={ gatewayLoading }
					gatewayReady={ gatewayReady }
					locked={ gatewayBusy }
					error={ payError }
					notice={ payNotice }
					deadlineLabel={
						resume ? deadlineLabel( resume.expires_at ) : ''
					}
					resuming={ !! resume }
					onRetry={ retryPayment }
					onPayOnsite={ () => choosePayMethod( ONSITE ) }
					stepIndex={ stepIndex }
					stepCount={ stepCount }
					focusOnMount={ navigatedRef.current }
					onBack={ backToDetails }
					onSubmit={ submit }
					submitting={ submitBlocked }
				/>
			);
		}

		if ( step === 'confirmation' && payIncomplete ) {
			return (
				<PaymentIncomplete
					orderCode={ payIncomplete.orderCode }
					deadlineLabel={ payIncomplete.deadlineLabel }
					failureCopy={ payIncomplete.failureCopy }
					released={ !! payIncomplete.released }
					onRetry={
						payIncomplete.retryable
							? () => {
									setPayIncomplete( null );
									setStep( 'payment' );
							  }
							: null
					}
					onBookAnother={ bookAnother }
					focusOnMount={ navigatedRef.current }
				/>
			);
		}

		if ( step === 'confirmation' && response ) {
			return (
				<Confirmation
					response={ response }
					displayTz={ displayTz }
					locale={ config.locale }
					businessName={ config.business.name }
					payment={ payResult }
					focusOnMount={ navigatedRef.current }
					onBookAnother={ bookAnother }
				/>
			);
		}

		if ( step === 'confirmation' && minimalConfirm ) {
			return (
				<MinimalConfirmation
					confirmed={ minimalConfirm.confirmed }
					details={ minimalConfirm.details }
					locale={ config.locale }
					payment={ payResult }
					focusOnMount={ navigatedRef.current }
					onBookAnother={ bookAnother }
				/>
			);
		}

		// A return or resume leg resolves over the network; show the same skeleton
		// the catalogue uses rather than a blank widget.
		if ( returnLeg || resumeToken ) {
			return <ServiceSkeleton />;
		}

		return null;
	}

	// Content-column width follows the reference's `mainCls` exactly: while the
	// summary is on, the column takes whatever the sidebar leaves (NO 660px cap —
	// capping it here left a dead gutter beside the sidebar at ≥900px containers);
	// Service is the 820px catalogue; the sidebar-less steps (Confirmation, and any
	// future Review) keep the narrow 660px cap.
	const mainClass =
		'ap-main' +
		( hasSummary ? '' : step === 'service' ? ' service' : ' narrow' );

	const [ recapOpen, setRecapOpen ] = useState( false );

	return (
		<div class="ap-wrap" ref={ wrapRef }>
			<div class="ap">
				{ hasSummary && (
					<div class="ap-recap">
						<button
							type="button"
							class="ap-recap-bar"
							aria-expanded={ recapOpen ? 'true' : 'false' }
							aria-controls={ RECAP_PANEL_ID }
							onClick={ () => setRecapOpen( ( o ) => ! o ) }
						>
							<span class="ap-recap-line">
								{ recapLine( {
									service,
									slotUtc: selectedSlotUtc,
									displayTz,
									locale: config.locale,
								} ) }
							</span>
							<span
								class={ 'ap-recap-chev' + ( recapOpen ? ' up' : '' ) }
							>
								<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
									<path d="M9 6l6 6-6 6" />
								</svg>
							</span>
						</button>
						<div
							class={ 'ap-recap-panel' + ( recapOpen ? ' open' : '' ) }
							id={ RECAP_PANEL_ID }
							// The collapsed panel is only visually clipped
							// (max-height:0 keeps the height transition), so it
							// stays in the a11y tree unless we say otherwise.
							// Safe to hide outright: the summary is text only —
							// nothing focusable is buried in here.
							aria-hidden={ recapOpen ? 'false' : 'true' }
						>
							<div class="ap-recap-panel-in">
								<Summary
									service={ service }
									locale={ config.locale }
									currencyExponent={ currencyExponent }
									displayTz={ displayTz }
									businessTz={ businessTz }
									slotUtc={ selectedSlotUtc }
								/>
							</div>
						</div>
					</div>
				) }

				<div class={ 'ap-body' + ( hasSummary ? ' has-summary' : '' ) }>
					<div class={ mainClass }>{ renderStep() }</div>
					{ hasSummary && (
						// Complementary landmark, named by its own heading, so a
						// screen-reader user can jump to the running booking
						// summary instead of hunting for it between the step's
						// controls. Ids are safe to hard-code: every widget lives
						// in its own ShadowRoot.
						<aside
							class="ap-aside"
							aria-labelledby={ SUMMARY_HEADING_ID }
						>
							<h2 class="ap-sum-title" id={ SUMMARY_HEADING_ID }>
								{ COPY.summary_title }
							</h2>
							<Summary
								service={ service }
								locale={ config.locale }
								currencyExponent={ currencyExponent }
								displayTz={ displayTz }
								businessTz={ businessTz }
								slotUtc={ selectedSlotUtc }
							/>
						</aside>
					) }
				</div>
			</div>
			{ toast && <Toast title={ toast.title } body={ toast.body } /> }
		</div>
	);
}

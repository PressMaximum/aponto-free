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
 *  - Location step (D-R62): derived from the published location roster, between Service and
 *    Staff; the chosen, silently assigned or preset `location_id` rides both requests, and
 *    staff eligibility is asked at it.
 *  - One-page frame (D-R80): block `layout: 'one-page'` + a locked service swaps the wizard
 *    chrome for an intro panel beside the active screen; the step machine is the same one.
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
	sameDisplayZone,
	suggestedTimezones,
	timezoneOptions,
	groupSlotsByDay,
	dayKeyInTz,
	fmtTime,
	rememberedTz,
	rememberTz,
	setTimeFormat,
	TZ_MODE_BUSINESS,
} from './lib/tz.js';
import { classifyError } from './lib/errors.js';
import {
	SUMMARY_MODES,
	STAFF_DEFAULTS,
	preselectDateFor,
	normalizeStaffRoster,
	normalizeStaffIds,
	normalizeLocationRoster,
	normalizeServiceLocationIds,
	normalizeLocationStaffIds,
	isPhoneLike,
} from './lib/config.js';
import { COPY, sprintf, paymentFailureCopy } from './lib/copy.js';
import { ServiceStep } from './components/ServiceStep.jsx';
import { StaffStep } from './components/StaffStep.jsx';
import { LocationStep } from './components/LocationStep.jsx';
import { StaffProfileDialog } from './components/StaffProfileDialog.jsx';
import { DateTimeStep } from './components/DateTimeStep.jsx';
import { DetailsStep, customKey } from './components/DetailsStep.jsx';
import { isDepositOrder } from './components/DepositLines.jsx';
import { usePaymentChoice } from '@aponto/form-payment-choice';
import { PaymentStep, ONSITE } from './components/PaymentStep.jsx';
import {
	Confirmation,
	MinimalConfirmation,
	PaymentIncomplete,
	ResumeUnavailable,
	ServiceUnavailable,
} from './components/Confirmation.jsx';
import {
	Summary,
	RecapLine,
	SUMMARY_HEADING_ID,
	totalNoteGateway,
} from './components/Summary.jsx';
import { Toast, Banner } from './components/feedback.jsx';
import {
	CheckoutNotice,
	heldStarts,
	useCheckoutSession,
} from './components/CheckoutNotice.jsx';
import {
	ServiceSkeleton,
	IntroSkeleton,
	DateTimeSkeleton,
} from './components/Skeletons.jsx';
import { IntroPanel } from './components/IntroPanel.jsx';
import {
	createGatewayAdapter,
	gatewayCancelledCopy,
	gatewayCopy,
	gatewayUnavailableCopy,
	isRenderable,
} from './lib/payments.js';
import { directCheckout } from '@aponto/payment-gateways';
import { formatMoney } from './lib/format.js';
import { normalizePart } from '../shared/person-name.js';
// Edition-resolved (webpack alias, D-R41 ownership): Premium's coupon seam, or
// Free's inert stub that renders nothing and never calls a paid route.
import { useFormCoupon } from '@aponto/form-coupons';
import { gatewayPrecheck, publicRefusal } from './lib/payments/precheck.js';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Disclosure target for the narrow-container recap bar (ShadowRoot-scoped id). */
const RECAP_PANEL_ID = 'ap-recap-panel';

/**
 * Normalize a `/public/services` response into the catalogue shape the widget holds (D-R50).
 *
 * The roster is normalized BEFORE the items, because a service's `staff_ids` is only meaningful
 * against a roster that can name every id in it. Shared by the initial load and by the re-read
 * the `409 aponto_slot_taken` recovery does, so the two can never disagree about the shape.
 *
 * The LOCATION roster (D-R62) follows the same rule for the same reason: `locations[]` first,
 * then each item's `location_ids` against it, then its per-location staff map against both.
 * All three are empty whenever the server omits them, which is every Free and single-location
 * site.
 *
 * @param {Object} res `/public/services` payload.
 * @return {{services: Array<Object>, staff: Array<Object>, locations: Array<{id:number,name:string,address:string}>}} Catalogue.
 */
export function normalizeCatalogue( res ) {
	const staff = normalizeStaffRoster( res && res.staff );
	const locations = normalizeLocationRoster( res && res.locations );
	const services = ( ( res && res.items ) || [] ).map( ( item ) => {
		const locationIds = normalizeServiceLocationIds( item, locations );
		return Object.assign( {}, item, {
			staff_ids: normalizeStaffIds( item && item.staff_ids, staff ),
			location_ids: locationIds,
			location_staff_ids: normalizeLocationStaffIds(
				item,
				locationIds,
				staff
			),
			// The same map, NOT filtered by the staff roster — for the block-preset narrowing
			// only, which must work on a site that publishes no `staff[]` (fix round 2).
			location_staff_ids_raw: normalizeLocationStaffIds(
				item,
				locationIds,
				null
			),
		} );
	} );

	return { services, staff, locations };
}

/**
 * Whether a service carries the per-location staff map (D-R62) — i.e. the server published the
 * location roster AND answered, for this service, who works where.
 *
 * @param {?Object} service Service (with normalized `location_staff_ids`).
 * @return {boolean} Whether narrowing information exists.
 */
function hasLocationStaff( service ) {
	return (
		!! service &&
		!! service.location_staff_ids &&
		Object.keys( service.location_staff_ids ).length > 0
	);
}

/**
 * The staff ids eligible for ONE service at ONE location (D-R62, D-R60 rule 8).
 *
 * `eligible(service, location) = item.location_staff_ids[location] ?? []` (rest-contract §3.1
 * addendum 2026-09-23, "sửa lần 2"). Narrowing is per (service, location) PAIR, never per staff
 * member: while the location roster is published `staff_ids` is the UNION over every branch, and
 * a person who does Cuts at one branch and Color at another must not be offered for a Cut at the
 * second. No location yet, or no per-location map at all (no location roster — Free, single
 * location, a preset on such a site) ⇒ `staff_ids`, unchanged.
 *
 * @param {?Object} service    Service (with normalized `staff_ids`, `location_staff_ids`).
 * @param {?number} locationId The effective location, or null.
 * @return {number[]} Eligible staff ids.
 */
export function eligibleStaffFor( service, locationId ) {
	const ids = ( service && service.staff_ids ) || [];
	if ( ! locationId || ! hasLocationStaff( service ) ) {
		return ids;
	}
	return service.location_staff_ids[ locationId ] || [];
}

/**
 * The location ids ONE service can be booked at from this block (D-R62).
 *
 * The service's own `location_ids`, narrowed to the branches where a block-PRESET staff member
 * does THIS service: a block pinned to somebody who only works Uptown must not offer Downtown,
 * where their calendar is empty by construction. Read from the RAW per-location map (fix round
 * 2), which the server publishes with the location roster even when there is no staff roster to
 * name anybody against.
 *
 * NEVER empty when the service has locations: the map lists PUBLIC staff only (rest-contract
 * §3.1 — `isEligible()` "staff active, is_public"), so a hidden (`is_public = 0`) preset person
 * appears nowhere in it, and a preset who serves none of these branches is equally absent. In
 * both cases every branch is offered and the server's own eligibility answers the wrong ones
 * with an empty calendar — an empty Location step would be a dead end with no way out.
 *
 * @param {?Object} service     Service (with normalized `location_ids`, `location_staff_ids_raw`).
 * @param {?Object} presetStaff The block-preset staff member `{ id }`, or null.
 * @return {number[]} Location ids, in roster order.
 */
export function locationIdsFor( service, presetStaff = null ) {
	const ids = ( service && service.location_ids ) || [];
	const raw = ( service && service.location_staff_ids_raw ) || {};
	if ( ! presetStaff || ! Object.keys( raw ).length ) {
		return ids;
	}
	const served = ids.filter( ( id ) =>
		( raw[ id ] || [] ).includes( presetStaff.id )
	);
	return served.length ? served : ids;
}

/**
 * Whether the Location step applies to ONE service (D-R62) — the D-R50 Staff-step rule, term
 * for term:
 *  - a published location roster, which only exists when Premium `multi_location` is on, the
 *    owner left `booking.location_choice` on `visitor`, and ≥2 active locations serve a service —
 *    the server decides all of that (rest-contract §3.1 addendum 2026-09-23);
 *  - no block preset `locationId`, because a block that pins a place has already answered;
 *  - ≥2 locations FOR THIS SERVICE. One location is a fact, not a choice: it is assigned
 *    silently (D-R60 rule 3) and the step never shows.
 *
 * @param {?Object}                       service          Selected service.
 * @param {Array<{id:number,name:string}>} locations       Published location roster.
 * @param {?number}                       presetLocationId Block preset location id.
 * @param {?Object}                       [presetStaff]    Block-preset staff `{ id }`.
 * @return {boolean} Whether to show the step for this service.
 */
export function locationStepApplies(
	service,
	locations,
	presetLocationId,
	presetStaff = null
) {
	if ( presetLocationId || ! locations || ! locations.length || ! service ) {
		return false;
	}
	return locationIdsFor( service, presetStaff ).length >= 2;
}

/**
 * Whether the Location step belongs in the step LIST right now (D-R62) — the D-R50 DENOMINATOR
 * RULE verbatim: on the Service step, with nothing picked, the step counts if ANY service in the
 * catalogue is offered at ≥2 locations, and it is re-derived from the selected service the
 * moment there is one.
 *
 * @param {?Object} service          Selected service, or null.
 * @param {Object}  catalogue        Catalogue state (`services`, `locations`).
 * @param {?number} presetLocationId Block preset location id.
 * @param {?Object} [presetStaff]    Block-preset staff `{ id }`.
 * @return {boolean} Whether the step is in the list.
 */
export function locationStepInList(
	service,
	catalogue,
	presetLocationId,
	presetStaff = null
) {
	const locations = catalogue.locations || [];
	if ( presetLocationId || ! locations.length ) {
		return false;
	}
	if ( service ) {
		return locationStepApplies(
			service,
			locations,
			presetLocationId,
			presetStaff
		);
	}
	return ( catalogue.services || [] ).some( ( s ) =>
		locationStepApplies( s, locations, presetLocationId, presetStaff )
	);
}

/**
 * Whether the Staff step applies to ONE service (D-R50).
 *
 * Three terms, and each one removes a step that would ask a question with no answer:
 *  - a published roster (`staff[]`), which only exists when Premium `multi_staff` is on,
 *    the owner left `booking.staff_choice` on `visitor`, and the site has ≥2 eligible
 *    active staff — the server decides all of that (rest-contract §3.1);
 *  - no block preset `staffId`, because a block that pins a staff member has already made
 *    the choice and the editor control says exactly that;
 *  - ≥2 eligible staff FOR THIS SERVICE, since one staff member is a fact, not a
 *    choice — the same reasoning that skips the Service step for a lone service (B1).
 *
 * Since D-R62 the third term is asked AT THE EFFECTIVE LOCATION (D-R60 rule 8): after Service →
 * Location leaves one eligible staff member, the step is skipped exactly as it is for a
 * one-person service. With no location (no roster, or not picked yet) it is the union.
 *
 * @param {?Object}                       service       Selected service (with `staff_ids`).
 * @param {Array<{id:number,name:string}>} roster       Published roster.
 * @param {?number}                       presetStaffId Block preset staff id.
 * @param {?number}                       [locationId]  Effective location (D-R62), or null.
 * @return {boolean} Whether to show the step for this service.
 */
export function staffStepApplies(
	service,
	roster,
	presetStaffId,
	locationId = null
) {
	if ( presetStaffId || ! roster || ! roster.length || ! service ) {
		return false;
	}
	return eligibleStaffFor( service, locationId ).length >= 2;
}

/**
 * Whether the Staff step belongs in the step LIST right now (D-R50).
 *
 * The honest-numbering rule (SPEC-P1 §2.2 addendum B1 / the D-R38 payment step) is that the
 * fraction counts the steps this booking will really have — but on the Service step nothing
 * is picked yet, so "will it" has no single answer. THE DENOMINATOR RULE, chosen to match
 * what the Payment step already does with price: while no service is selected, ask the
 * question of the WHOLE CATALOGUE — the step counts if ANY service has ≥2 staff — and
 * re-derive it from the selected service the moment there is one. So a mixed catalogue reads
 * `01 / 05` on the first screen and drops to `01 / 04` when a single-staff service is
 * picked. That is a real change in the flow, not a lie about it, and it is the same shape of
 * renumbering the payment step already produces.
 *
 * @param {?Object}                        service       Selected service, or null.
 * @param {Object}                         catalogue     Catalogue state (`services`, `staff`).
 * @param {?number}                        presetStaffId Block preset staff id.
 * `locationOf` (D-R62) may be a number (the effective location of the picked service) or a
 * function `( service ) => ?number`: on the Service step each catalogue entry is then asked at
 * the location it WOULD be booked at — a preset or a single-branch service is known before the
 * pick — so the count does not jump the moment the customer picks (fix round 1).
 *
 * @param {?Object}                        service       Selected service, or null.
 * @param {Object}                         catalogue     Catalogue state (`services`, `staff`).
 * @param {?number}                        presetStaffId Block preset staff id.
 * @param {?number|Function}               [locationOf]  Effective location (D-R62), or a resolver.
 * @return {boolean} Whether the step is in the list.
 */
export function staffStepInList(
	service,
	catalogue,
	presetStaffId,
	locationOf = null
) {
	const roster = catalogue.staff || [];
	if ( presetStaffId || ! roster.length ) {
		return false;
	}
	const at = ( s ) =>
		typeof locationOf === 'function' ? locationOf( s ) : locationOf;
	if ( service ) {
		return staffStepApplies( service, roster, presetStaffId, at( service ) );
	}
	return ( catalogue.services || [] ).some( ( s ) =>
		staffStepApplies( s, roster, presetStaffId, at( s ) )
	);
}

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

/** The calendar month after `{year, month}` (0-based month). */
function nextMonthOf( year, month ) {
	return 11 === month ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

/**
 * How many months the Date & time step may move FORWARD on its own, looking for the first one with
 * an open time (D-R64 item 4). Two: three single-month reads span ≤ 93 days, but the step only ever
 * looks two months past the one it opened on — the "within the next ~62 days" a visitor expects —
 * and it never loops.
 */
const MAX_AUTO_HOPS = 2;

/** Build the availability fetch date-range for a display-tz calendar month. */
function monthRange( year, month ) {
	const last = new Date( Date.UTC( year, month + 1, 0 ) ).getUTCDate();
	return {
		from_date: year + '-' + pad2( month + 1 ) + '-01',
		to_date: year + '-' + pad2( month + 1 ) + '-' + pad2( last ),
	};
}

/**
 * The service the form opens on (D-R71t), or null to open on the Service step.
 *
 * A block `serviceId` preset wins and is the only source that LOCKS the service. Without one,
 * `?service_id=<id>` on the page URL only chooses the STARTING service: the Service step
 * stays in the flow and Back returns to it. The id is looked up in the public catalogue, so an
 * unknown, inactive or non-public id is ignored. A lone service is the start of a block with no
 * preset (B1). A preset the catalogue does not list (deleted or deactivated after the block was
 * saved) never falls back to the lone service (QA D01, 2026-10-05, newer than D-R75: a draft
 * "Strategy call" beside one paid "Website audit" silently turned the page into the paid
 * service); only an explicit `?service_id=` may still choose the starting service.
 *
 * @param {Array<Object>} services Public catalogue services.
 * @param {?number}       presetId Block preset service id.
 * @param {string}        search   `location.search`.
 * @return {?Object} The starting service.
 */
export function startingService( services, presetId, search ) {
	const preset = presetId ? services.find( ( s ) => s.id === presetId ) : null;
	if ( preset ) {
		return preset;
	}
	const m = /[?&]service_id=(\d{1,10})(&|$)/.exec( search || '' );
	return (
		( m && services.find( ( s ) => s.id === Number( m[ 1 ] ) ) ) ||
		( ! presetId && services.length === 1 ? services[ 0 ] : null )
	);
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
		// The site's 12 h / 24 h convention, before anything formats a time (persona QA
		// 2026-10-05, T-071): mails, the cart and the manage page already follow it.
		setTimeFormat( config.timeFormat );
		const businessTz = canonicalizeZone( config.business.timezone || 'UTC' );
		const browserTz = browserTimezone();
		// `booking.timezone_mode` (D-R48): a PRESENTATION default only. Whatever it
		// says, the picker exists and `customer_timezone` still persists the zone
		// the visitor actually booked in.
		return resolveDisplayTz( {
			browserTz,
			businessTz,
			mode: config.business.timezone_mode,
		} );
	}, [ config ] );
	// A zone the visitor picked on an earlier visit wins over the init rule (T-096) — it is
	// their own answer to the same question, and it is only honoured from the same browser zone.
	const [ displayTz, setDisplayTz ] = useState(
		() => rememberedTz( tzInit.browserTz ) || tzInit.displayTz
	);
	const businessTz = tzInit.businessTz;
	// The SSA-style "Times shown in …" prefix: only a `business`-mode site, and
	// only while the clock on screen is not the visitor's own. Recomputed from the
	// LIVE display zone, so the note disappears the moment a remote visitor moves
	// the flow onto their own zone.
	const showTzNote = useMemo(
		() =>
			TZ_MODE_BUSINESS === tzInit.mode &&
			! sameDisplayZone( displayTz, tzInit.browserTz ),
		[ tzInit, displayTz ]
	);
	// Every zone the ENGINE knows, resolved at runtime so the list costs the
	// bundle nothing — plus the two zones this page is already using, in case the
	// runtime's tables omit one. Offset-form zones never enter either list:
	// `display_tz` is posted at submit and the REST layer takes IANA names only.
	const tzOptions = useMemo(
		() => timezoneOptions( [ tzInit.browserTz, businessTz ] ),
		[ tzInit, businessTz ]
	);
	const tzSuggested = useMemo(
		() => suggestedTimezones( [ tzInit.browserTz, businessTz, displayTz ] ),
		[ tzInit, businessTz, displayTz ]
	);

	// --- Catalogue. -----------------------------------------------------------
	const [ catalogue, setCatalogue ] = useState( {
		loading: true,
		error: false,
		services: [],
		categories: [],
		// The published staff roster (D-R50). `[]` on Free, on single-staff Premium and
		// on any site whose owner turned the choice off — the server omits both keys there, so
		// "no roster" is the normal, silent case and every branch below is dead code.
		staff: [],
		// The published LOCATION roster (D-R62). `[]` on Free, on single-location Premium and on
		// a site whose owner set `booking.location_choice = first` — omitted by the server there,
		// so the Location step and every `location_id` below are dead code on those sites.
		locations: [],
	} );
	const [ service, setService ] = useState( null );
	/**
	 * The staff member the customer picked (D-R50). THREE states, and the third one is the point:
	 *
	 *   `undefined` — not chosen yet. No row is pressed when the step first opens.
	 *   `null`      — "Any available", chosen deliberately.
	 *   `<id>`      — a named staff member.
	 *
	 * `null` alone was the initial value in the first cut, which pre-pressed the "Any available"
	 * row — and since the rows auto-advance on click (like the Service step), the customer had to
	 * click the row that already looked chosen in order to move on (browser verification). Both
	 * `undefined` and `null` resolve to the same `staff_id: null` on the wire; the difference is
	 * purely what the step shows before the first pick, and what Back shows after one.
	 */
	const [ staffChoice, setStaffChoice ] = useState( undefined );
	/**
	 * The open staff profile dialog: `{ member, trigger }`, or null (D-R52).
	 *
	 * It lives HERE rather than in `StaffStep` for a structural reason, not a stylistic one:
	 * `.ap-main` is a CSS container (`container-type: inline-size`, which the Cards grid needs),
	 * and containment makes it the containing block for absolutely positioned descendants. A
	 * dialog rendered inside the step would therefore be clipped to the content column instead
	 * of covering the card and its summary sidebar. So the card owns it.
	 */
	const [ staffProfile, setStaffProfile ] = useState( null );
	/** The "Learn more" button to hand focus back to once the dialog closes. */
	const profileReturnRef = useRef( null );
	/**
	 * Set once the SERVER has refused an unnamed booking because the site now requires a named
	 * choice (fix round 1, P2-1).
	 *
	 * The page-global `staff.choice` is a snapshot of the setting as it stood when this page was
	 * rendered. If the owner switches to "Customers must choose" while somebody is filling the
	 * form in, that tab keeps offering "Any available" and keeps getting refused — a loop with
	 * no exit, because nothing in the tab ever learns the setting changed. The 422 IS that
	 * lesson, so it is remembered for the rest of the session and the step behaves as `required`
	 * from then on.
	 */
	const [ staffRequiredBySrv, setStaffRequiredBySrv ] = useState( false );
	/**
	 * The `staff_id` this booking sends to `/public/availability` and `POST /public/bookings`.
	 *
	 * Precedence, and it is the same on both requests so the slots the visitor saw are the
	 * slots they book: a block PRESET wins (the editor's "Preselected staff" pins the booking
	 * and removes the step), then the customer's own choice, then `null` — which is the
	 * contract's any-staff union on read and `reserveAnyStaff()` on write (SPEC-P0 §5.6).
	 */
	const effectiveStaffId = config.staffId || staffChoice || null;

	/** Whether the customer has NAMED a staff member (as opposed to Any, or not having picked). */
	const namedStaffId = typeof staffChoice === 'number' ? staffChoice : null;

	/**
	 * The location the customer picked on the Location step (D-R62). `undefined` until the first
	 * pick — no row is pressed when the step first opens — then `<id>`. There is NO third "any"
	 * state, unlike `staffChoice`: D-R60 rule 3 rules out "Any location".
	 */
	const [ locationChoice, setLocationChoice ] = useState( undefined );

	/**
	 * The block-PRESET staff member, as `{ id }`, or null (D-R62). Where they do a service narrows
	 * the places this block may offer — see {@link locationIdsFor}. It does NOT need the staff
	 * roster: the per-location map is published with the LOCATION roster even when `staff[]` is
	 * not (`staff_choice = any`, or <2 public staff — rest-contract §3.1 review round 3), and the
	 * raw numeric copy of it is what the preset is looked up in (fix round 2).
	 */
	const presetStaff = config.staffId ? { id: config.staffId } : null;

	/**
	 * The `location_id` a booking for service `s` sends, given a candidate choice (D-R62).
	 *
	 * Precedence mirrors {@link effectiveStaffId}, and it is the same on the availability read
	 * and the booking write so the slots the visitor saw are the slots they book:
	 *  1. a block PRESET — the owner pinned the place and the step is gone;
	 *  2. the customer's own pick, while this service is still offered there;
	 *  3. the ONE location the service is offered at, assigned silently (D-R60 rule 3) and SENT —
	 *     with a published roster the server refuses a null `location_id` site-wide, not per
	 *     service (rest-contract §3.3 addendum 2026-09-23);
	 *  4. `null` — every site without a location roster, which keeps their availability query
	 *     and booking body byte-identical to the build before D-R62.
	 *
	 * @param {?Object} s      Service.
	 * @param {Object}  cat    Catalogue state.
	 * @param {*}       choice Candidate `locationChoice`.
	 * @return {?number} Location id, or null.
	 */
	function locationForIn( s, cat, choice ) {
		if ( config.locationId ) {
			return config.locationId;
		}
		const ids = locationIdsFor( s, presetStaff );
		if ( typeof choice === 'number' && ids.includes( choice ) ) {
			return choice;
		}
		return ids.length === 1 ? ids[ 0 ] : null;
	}

	/**
	 * `normalizeCatalogue()` plus the one rule that needs this block's props (D-R62 fix round 1):
	 * with a location roster published and a block PRESET `locationId`, a service the pinned
	 * branch does not offer is not listed at all — otherwise it would open on a calendar that is
	 * empty by construction (including a non-first branch on a `location_choice = first` site,
	 * where the tab has no roster and so nothing to filter by; the server's 422 covers that one).
	 * A preset `staffId` is NOT filtered the same way: that dead end predates D-R62 and the
	 * staff roster may legitimately omit the preset person (non-public), so filtering by it
	 * could empty the catalogue.
	 *
	 * @param {Object} res `/public/services` payload.
	 * @return {Object} Catalogue.
	 */
	function shapeCatalogue( res ) {
		const next = normalizeCatalogue( res );
		if ( config.locationId && next.locations.length ) {
			next.services = next.services.filter( ( s ) =>
				s.location_ids.includes( config.locationId )
			);
		}
		return next;
	}

	/** The `location_id` this booking sends right now (D-R62). */
	const effectiveLocationId = locationForIn( service, catalogue, locationChoice );

	/**
	 * Where the flow goes once a location is settled: Staff when a choice remains AT that
	 * location (D-R60 rule 8), otherwise Date & time.
	 *
	 * @param {Object}  s   Service.
	 * @param {Object}  cat Catalogue state.
	 * @param {?number} loc Effective location.
	 * @return {string} Step key.
	 */
	function stepAfterLocation( s, cat, loc ) {
		return staffStepApplies( s, cat.staff, config.staffId, loc )
			? 'staff'
			: 'datetime';
	}

	/**
	 * Where the flow goes once a service is settled: Location when the service is offered at ≥2
	 * places (D-R62), otherwise wherever {@link stepAfterLocation} says for the one location it
	 * has (or none).
	 *
	 * @param {Object} s      Service.
	 * @param {Object} cat    Catalogue state.
	 * @param {*}      choice Candidate `locationChoice`.
	 * @return {string} Step key.
	 */
	function stepAfterService( s, cat, choice ) {
		if (
			locationStepApplies(
				s,
				cat.locations,
				config.locationId,
				presetStaff
			)
		) {
			return 'location';
		}
		return stepAfterLocation( s, cat, locationForIn( s, cat, choice ) );
	}

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
	// A preset the loaded catalogue does not list (the service was deleted or deactivated after
	// the block was saved) is no preset at all: the block behaves exactly like one without it,
	// rather than dropping a Service step the visitor is still standing on (`00 / 03`).
	const presetMissing =
		!! preselectedId &&
		! catalogue.loading &&
		! catalogue.error &&
		! catalogue.services.some( ( s ) => s.id === preselectedId );
	// QA D01 (2026-10-05): a block that NAMES a service the catalogue no longer lists never falls
	// back to the lone-service rule. It used to: a draft "Strategy call" beside one paid "Website
	// audit" turned the page into the paid service, silently. Step by step now shows the Service
	// step even for a lone service (the visitor sees what they book); one page shows "This
	// service is no longer available" (`onePageUnavailable` below).
	const singleService =
		! preselectedId &&
		! catalogue.loading &&
		catalogue.services.length === 1;
	const serviceLocked = ( !! preselectedId && ! presetMissing ) || singleService;

	// True once the first available day has been auto-picked for the current service, so a manual
	// pick or deliberate month browsing afterwards is never overridden (B1). Reset whenever the
	// visitor (re-)enters Date & time for a service.
	const autoPickedRef = useRef( false );

	const loadCatalogue = useCallback( () => {
		setCatalogue( ( c ) => Object.assign( {}, c, { loading: true, error: false } ) );
		api.getServices().then(
			( res ) => {
				const { services, staff, locations } = shapeCatalogue( res );
				setCatalogue( {
					loading: false,
					error: false,
					services,
					categories: res.categories || [],
					staff,
					locations,
				} );
				// A gateway return leg is already showing an outcome panel; the
				// catalogue must not shove the visitor back into the flow behind
				// it just because there is one service to preselect.
				if ( returnLeg || resumeToken ) {
					return;
				}
				// With the Service step skipped, the FIRST step is whichever of Location / Staff /
				// Date & time actually applies to the locked service (D-R50, D-R62).
				const firstStepFor = ( picked ) =>
					stepAfterService(
						picked,
						{ services, staff, locations },
						undefined
					);
				// The block preset, else `?service_id=` (D-R71t), else the one active
				// service of a block with no preset (B1 — the Service step is skipped). A
				// missing preset never becomes the lone service (QA D01). No markNav() so the
				// auto-advance doesn't steal focus on first paint.
				const start = startingService(
					services,
					preselectedId,
					typeof window !== 'undefined' && window.location
						? window.location.search
						: ''
				);
				if ( start ) {
					autoPickedRef.current = false;
					setService( start );
					setStep( firstStepFor( start ) );
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
	} );
	const [ selectedDayKey, setSelectedDayKey ] = useState( null );
	const [ selectedSlotUtc, setSelectedSlotUtc ] = useState( null );
	const fetchToken = useRef( 0 );
	// D-R64 item 4 — AUTO-ADVANCE past an empty month, on the step's first read only. `armed` is
	// set when the calendar is (re)started — entering the step, or a new service / staff member /
	// location / display zone — and cleared the moment the visitor pages by hand or a read commits,
	// so a month the VISITOR chose is never skipped. `skip` is the month a hop just committed with
	// its answer already in hand: the refetch effect reads it and does not ask for it twice.
	const autoAdvance = useRef( { armed: false, scope: '', skip: '' } );
	// "Showing October 2026 — the first month with available times." — announced (hidden live
	// region in DateTimeStep) when a hop lands; cleared by any other calendar move.
	const [ monthNotice, setMonthNotice ] = useState( '' );

	/**
	 * Throw away everything derived from the CURRENT availability request, synchronously.
	 *
	 * The token is bumped HERE — at the click — rather than being left to the next
	 * `fetchAvailability()` the refetch effect happens to run (fix round 1). Between a state
	 * change and the effect that reacts to it there is a real window in which the in-flight
	 * response for the OLD service or the OLD staff member can resolve; with the token still
	 * matching, it was accepted, and the visitor got somebody else's calendar (and could pick a
	 * slot out of it). Bumping first makes that response unconditionally stale.
	 *
	 * The day, the slot and the auto-pick flag go with it, for the same reason: they describe a
	 * calendar that is no longer the one being shown.
	 */
	function invalidateAvailability() {
		fetchToken.current += 1;
		autoPickedRef.current = false;
		carriedRef.current = false;
		setSelectedDayKey( null );
		setSelectedSlotUtc( null );
		setAvail( { loading: true, error: false, index: {} } );
	}

	const fetchAvailability = useCallback(
		( year, month, tz, advance = false ) => {
			if ( ! service ) {
				return;
			}
			const token = ++fetchToken.current;
			setAvail( ( a ) => Object.assign( {}, a, { loading: true, error: false } ) );
			const read = ( y, m ) =>
				api.getAvailability(
					Object.assign(
						{
							service_id: service.id,
							staff_id: effectiveStaffId,
							// `null` is dropped by the query builder, so a site with no location
							// roster sends exactly the query it sent before D-R62.
							location_id: effectiveLocationId,
							tz,
						},
						monthRange( y, m )
					)
				);
			const commit = ( y, m, index ) => {
				autoAdvance.current.armed = false;
				if ( y !== year || m !== month ) {
					// A hop landed: show that month with the answer already read, and say so.
					autoAdvance.current.skip = y + '-' + m;
					setCal( { year: y, month: m } );
					setMonthNotice(
						sprintf(
							COPY.month_advanced,
							new Intl.DateTimeFormat( config.locale || undefined, {
								month: 'long',
								year: 'numeric',
								timeZone: 'UTC',
							} ).format( Date.UTC( y, m, 15 ) )
						)
					);
				}
				setAvail( { loading: false, error: false, index } );
			};
			// D-R64 item 4: an EMPTY first month moves on — at most MAX_AUTO_HOPS months, never past
			// the last year the calendar offers — and when every one of them is empty the ORIGINAL
			// month is shown with its (empty) answer, rather than stranding the visitor months
			// ahead. Every hop re-checks the token, so a newer selection (D-R50 (iii): the token is
			// bumped synchronously at the click) cancels the chain wherever it is.
			const attempt = ( y, m, hops, origin ) =>
				read( y, m ).then( ( res ) => {
					if ( token !== fetchToken.current ) {
						return;
					}
					const index = groupSlotsByDay( res.slots || [], tz );
					const first = origin || index;
					if ( ! advance || Object.keys( index ).length ) {
						commit( y, m, index );
						return;
					}
					const next = nextMonthOf( y, m );
					if ( hops >= MAX_AUTO_HOPS || next.year > initialYear + 1 ) {
						commit( year, month, first );
						return;
					}
					return attempt( next.year, next.month, hops + 1, first );
				} );
			attempt( year, month, 0, null ).catch(
				( raw ) => {
					if ( token !== fetchToken.current ) {
						return;
					}
					// The KIND travels with the failure (D-R54). `429` here is not a broken
					// connection, and telling a visitor to "check your connection" when the
					// server asked them to wait sends them to reload, retry and eventually
					// give up — the one recovery that cannot work.
					const info = classifyError( raw );
					setAvail( ( a ) =>
						Object.assign( {}, a, {
							loading: false,
							error: {
								kind: info.kind,
								retryAfter: info.retryAfter,
							},
						} )
					);
				}
			);
		},
		[ api, service, effectiveStaffId, effectiveLocationId, config.locale, initialYear ]
	);

	// Refetch whenever the visible month, the display timezone, the service — or, since
	// D-R50, the chosen staff member, and since D-R62 the location — change. A different staff
	// member or a different branch is a different calendar.
	//
	// D-R64 item 4: a change of anything BUT the month (entering the step, service, staff, location,
	// zone) re-arms the auto-advance; a month change alone does not — it is either the visitor
	// paging (which disarmed it) or a hop that already holds its answer (`skip`).
	useEffect( () => {
		const state = autoAdvance.current;
		const scope = [ step, service && service.id, effectiveStaffId, effectiveLocationId, displayTz ].join( '|' );
		if ( scope !== state.scope ) {
			state.scope = scope;
			state.armed = true;
			state.skip = '';
			setMonthNotice( '' );
		}
		if ( state.skip === cal.year + '-' + cal.month ) {
			state.skip = '';
			return;
		}
		if ( step === 'datetime' && service ) {
			// A slot the visitor is HOLDING pins the calendar to its month (founder 2026-10-04,
			// option B): never hop away from it, even when that month now reads empty. A slot with
			// no day (a resumed payment) pins nothing — the calendar was never moved to it.
			fetchAvailability(
				cal.year,
				cal.month,
				displayTz,
				state.armed && ! ( selectedSlotUtc && selectedDayKey )
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		step,
		service,
		effectiveStaffId,
		effectiveLocationId,
		cal.year,
		cal.month,
		displayTz,
	] );

	// Auto-select the first day that has availability so times render immediately, Calendly-style
	// (B1 — finding U3 Jonas). Only the FIRST time per service-entry (autoPickedRef) and only while
	// nothing is chosen, so a manual pick or deliberate month browsing is respected. An EMPTY first
	// month no longer leaves this waiting (D-R64 item 4): `fetchAvailability()` has already moved the
	// calendar up to two months on, so this picks that month's first day. A month the visitor pages
	// to by hand still just waits for their pick.
	//
	// D-R84: the block may turn the SELECTION off (`preselectDate`, off by default for one-page):
	// the calendar then opens on its own and the slots appear when the visitor picks a day. Only the
	// selection is gated — the availability read and the D-R64 month hop (with its announcement)
	// run exactly as before, and a day the visitor chose survives Back / "Change time".
	const preselectDate = preselectDateFor( config.preselectDate, config.layout );
	useEffect( () => {
		if (
			! preselectDate ||
			step !== 'datetime' ||
			avail.loading ||
			selectedDayKey ||
			autoPickedRef.current
		) {
			return;
		}
		const keys = Object.keys( avail.index ).sort();
		if ( keys.length > 0 ) {
			autoPickedRef.current = true;
			setSelectedDayKey( keys[ 0 ] );
		}
	}, [ preselectDate, step, avail.index, avail.loading, selectedDayKey ] );

	// What a display-zone change carried over (founder 2026-10-04, option B) must still be OFFERED
	// by the re-read that follows. A slot someone else took in the meantime is dropped — the day
	// stays, showing what is left — so Continue is never enabled for a time the grid does not
	// show. A day with no slot chosen keeps its calendar date, and when that date has no times in
	// the new zone the selection moves to the next day that has (else the last one). Only that
	// re-read is checked (`carriedRef`): coming Back from Details or Payment re-reads too, and
	// there the visitor's own hold may still be covering the slot while its release is in flight.
	const carriedRef = useRef( false );
	useEffect( () => {
		if ( ! carriedRef.current || step !== 'datetime' || avail.loading || avail.error ) {
			return;
		}
		carriedRef.current = false;
		const offered = avail.index[ selectedDayKey ] || [];
		if ( selectedSlotUtc ) {
			if ( ! offered.some( ( slot ) => slot.start_utc === selectedSlotUtc ) ) {
				setSelectedSlotUtc( null );
			}
		} else if ( selectedDayKey && offered.length === 0 ) {
			const keys = Object.keys( avail.index ).sort();
			setSelectedDayKey(
				keys.find( ( key ) => key > selectedDayKey ) || keys[ keys.length - 1 ] || null
			);
		}
	}, [ step, avail, selectedDayKey, selectedSlotUtc ] );

	// --- Details + submit. ----------------------------------------------------
	const [ details, setDetails ] = useState( {
		first_name: '',
		last_name: '',
		email: '',
		phone: '',
		note: '',
	} );
	const [ consent, setConsent ] = useState( false );
	// Checkout continuity (D-R71w): inert unless an offered gateway publishes `session_url`.
	const checkout = useCheckoutSession( {
		gateways: config.payments && config.payments.gateways,
		nonce: config.nonce,
		details,
		setDetails,
	} );
	// Answers to the site's extra booking-form fields, keyed by slug (D-R30).
	// Absent = unanswered; the submitted body carries only answered ones.
	const [ customValues, setCustomValues ] = useState( {} );
	const [ honeypot, setHoneypot ] = useState( '' );
	const [ fieldErrors, setFieldErrors ] = useState( null );
	const [ submitting, setSubmittingState ] = useState( false );
	// "The time you chose was just taken" on Date & time, until another slot is picked (QA D14).
	const [ slotTakenNotice, setSlotTakenNotice ] = useState( false );
	// The SYNCHRONOUS twin of `submitting` (QA D03 / persona QA T-102, 2026-10-05): a double tap
	// lands twice inside one frame, and the second handler still closes over `submitting ===
	// false`, so it posted again with the same idempotency key and the server's replay swapped the
	// full confirmation for the reduced "already emailed" one. The ref flips before the handler
	// returns and the guards read it, so the second tap of a pair is simply not a submit; the
	// state still drives the disabled button.
	const submittingRef = useRef( false );
	const setSubmitting = useCallback( ( value ) => {
		submittingRef.current = !! value;
		setSubmittingState( !! value );
	}, [] );
	const [ submitError, setSubmitError ] = useState( null );
	const [ rateSeconds, setRateSeconds ] = useState( 0 );
	const [ toast, setToast ] = useState( null );
	const [ response, setResponse ] = useState( null );
	/** Drop one field's error, keeping the rest (null when none remain). */
	const clearFieldError = useCallback( ( key ) => {
		setFieldErrors( ( current ) => {
			if ( ! current || ! current[ key ] ) {
				return current;
			}
			const next = { ...current };
			delete next[ key ];
			return Object.keys( next ).length ? next : null;
		} );
	}, [] );
	// Order adjustments (Premium coupons, D-R67). The quote is bound to the
	// selected service; amounts stay server-owned.
	// An offered gateway whose own checkout owns discounts publishes `coupons: 0`
	// in its client config; the widget then shows no coupon field of its own, for
	// every method on the step, so no order can carry two discounts.
	const couponsDeclined = (
		( config.payments && config.payments.gateways ) ||
		[]
	).some( ( gateway ) => gateway?.client?.coupons === '0' );
	const coupon = useFormCoupon( {
		enabled:
			!! ( config.coupons && config.coupons.enabled ) && ! couponsDeclined,
		service,
		api,
		onFieldClear: clearFieldError,
	} );
	// `attemptBooking` is memoised, so it reads the CURRENT seam through a ref.
	const couponRef = useRef( coupon );
	couponRef.current = coupon;

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
	// The site's ONE payment method, when it is required and checks out on the gateway's own
	// page — asked of the site alone, so it has an answer before a service is picked (T-095).
	const externalOnly = useMemo(
		() =>
			payments.mode === 'required' &&
			( payments.gateways || [] ).length === 1 &&
			gateways.length === 1
				? directCheckout( gateways[ 0 ] )
				: null,
		[ payments, gateways ]
	);
	const externalCheckout =
		Number( service?.price_minor ) > 0 ? externalOnly : null;
	const externalAttempt = useRef( null );
	const externalMounted = useRef( true );
	useEffect(
		() => () => {
			externalMounted.current = false;
		},
		[]
	);
	const [ externalReserved, setExternalReserved ] = useState( false );
	const [ payMethod, setPayMethod ] = useState( null );
	// What the paying gateway adds to the summary total at its own checkout (T-025 re-test).
	// The gateway's own copy decides; '' for a free service and for every other gateway.
	const totalNote = useMemo( () => {
		const paying =
			Number( service?.price_minor ) > 0
				? totalNoteGateway( {
						mode: payments.mode,
						offered: ( payments.gateways || [] ).length,
						gateways,
						payMethod,
				  } )
				: null;
		return ( paying && gatewayCopy( paying ).totalNote ) || '';
	}, [ service, payments, gateways, payMethod ] );
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
	const [ reservedOrder, setReservedOrder ] = useState( null );
	const reservedOrderRef = useRef( null );
	const previewTerms = coupon.quote ? coupon.quote.payment_terms : service?.payment_terms;
	const paymentChoice = usePaymentChoice( {
		previewTerms, serviceId: service?.id,
		reservedOrder: reservedOrder || resume?.order,
		locked: gatewayBusy || submitting,
		canChange: () => ! gatewayBusyRef.current && ! holdRef.current && ! reservedOrderRef.current && ! resumeRef.current,
		onChange: () => { setPayError( '' ); setPayNotice( null ); },
	} );
	const paymentTerms = reservedOrder || resume?.order || paymentChoice.terms || previewTerms || null;
	const paymentMode = isDepositOrder( paymentTerms ) || isDepositOrder( previewTerms ) ? 'required' : payments.mode;
	const effectiveTotalMinor =
		coupon.totalMinor !== null
			? coupon.totalMinor
			: service
			? Number( service.price_minor ) || 0
			: 0;

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
	// …unless the only way to pay is a gateway that takes the customer to its OWN checkout
	// (persona QA 2026-10-05, T-095). That flow has no Payment step for a paid service either, so
	// the catalogue's answer is "never": the rail used to promise "Payment" on the first screen of
	// such a site and silently drop it the moment a service was picked.
	const paymentStepExists =
		!! resume ||
		( ! externalCheckout && payments.mode !== 'off' &&
			gateways.length > 0 &&
			( service
				? effectiveTotalMinor > 0
				: ! externalOnly &&
				  catalogue.services.some(
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

	const payableMinor = paymentTerms?.payable_now_minor ?? effectiveTotalMinor;
	/** The order total, formatted exactly as the summary already shows it. */
	const totalLabel = service
		? formatMoney(
				payableMinor,
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
		if ( externalCheckout ) { return externalCheckout.code; }
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
			staff_id: effectiveStaffId,
			location_id: effectiveLocationId,
			start_utc: selectedSlotUtc,
			tz: displayTz,
			consent: consentEnabled ? consent : false,
			// The two name parts go through the shared normalizer — Unicode trim plus
			// internal whitespace collapsed — the same rule the server stores them by.
			customer: {
				first_name: normalizePart( details.first_name ),
				last_name: normalizePart( details.last_name ),
				email: details.email.trim(),
				phone: phoneMode === 'off' ? '' : details.phone.trim(),
				note: details.note.trim(),
			},
			custom_fields: collectCustom(),
			payment_method: paymentMethodOf( methodOverride ),
			payment_amount_mode: paymentChoice.amountMode,
			coupon_code: externalCheckout ? '' : coupon.draftCode,
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
				first_name: draft.customer.first_name,
				last_name: draft.customer.last_name,
				email: draft.customer.email,
				phone: draft.customer.phone,
				note: draft.customer.note,
			},
		};
		if ( draft.staff_id ) {
			body.staff_id = draft.staff_id;
		}
		// Same conditional-key rule as `staff_id` (D-R62): absent unless a location is in play,
		// so a site with no location roster posts the pre-D-R62 body byte for byte.
		if ( draft.location_id ) {
			body.location_id = draft.location_id;
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
			if ( draft.payment_amount_mode === 'full' ) {
				body.payment.amount_mode = 'full';
			}
		}
		if ( draft.coupon_code ) {
			body.coupon_code = draft.coupon_code;
		}
		if ( externalCheckout?.deferIdentity ) {
			delete body.customer;
			delete body.payment;
			delete body.coupon_code;
		}
		return body;
	}

	function validateDetails() {
		const e = {};
		if (
			! externalCheckout?.deferIdentity &&
			! normalizePart( details.first_name )
		) {
			e.first_name = COPY.err_first_name_required;
		}
		if (
			! externalCheckout?.deferIdentity &&
			! normalizePart( details.last_name )
		) {
			e.last_name = COPY.err_last_name_required;
		}
		if ( ! externalCheckout?.deferIdentity && ! details.email.trim() ) {
			e.email = COPY.err_email_required;
		} else if ( ! externalCheckout?.deferIdentity && ! EMAIL_RE.test( details.email.trim() ) ) {
			e.email = COPY.err_email_invalid;
		}
		if ( ! externalCheckout?.deferIdentity && phoneMode === 'required' && ! details.phone.trim() ) {
			e.phone = COPY.err_phone_required;
		} else if (
			// The server's own rule (persona QA 2026-10-05, T-088): "abc" used to be stored.
			! externalCheckout?.deferIdentity &&
			phoneMode !== 'off' &&
			details.phone.trim() &&
			! isPhoneLike( details.phone )
		) {
			e.phone = COPY.err_phone_invalid;
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
		// A typed-but-unapplied (or invalidated) code must never be dropped
		// silently into a full-price booking: Continue/Book waits for Apply or
		// a cleared field.
		const adjustmentError = externalCheckout ? null : coupon.validate();
		if ( adjustmentError && coupon.fieldKey ) {
			e[ coupon.fieldKey ] = adjustmentError;
		}
		return Object.keys( e ).length ? e : null;
	}

	/**
	 * Clear a field's error the moment THAT field becomes valid (QA D16, 2026-10-05) — not on the
	 * next submit. Only errors are removed, never added (a new one still waits for submit), and
	 * only for a field whose own value changed, so a server refusal on one field is not wiped by
	 * typing in another.
	 */
	const lastValuesRef = useRef( null );
	useEffect( () => {
		const values = Object.assign(
			{ consent },
			details,
			Object.fromEntries(
				customFields.map( ( f ) => [
					customKey( f.slug ),
					customValues[ f.slug ],
				] )
			)
		);
		const before = lastValuesRef.current;
		lastValuesRef.current = values;
		if ( ! before || ! fieldErrors ) {
			return;
		}
		const changed = Object.keys( values ).filter(
			( k ) => values[ k ] !== before[ k ] && fieldErrors[ k ]
		);
		if ( ! changed.length ) {
			return;
		}
		// A field that is still invalid keeps an error, but the message follows the value (QA N2):
		// "Please enter your email." becomes "Please enter a valid email address." once something
		// malformed is typed.
		const now = validateDetails() || {};
		const moved = changed.filter( ( k ) => now[ k ] !== fieldErrors[ k ] );
		if ( ! moved.length ) {
			return;
		}
		setFieldErrors( ( fe ) => {
			if ( ! fe ) {
				return fe;
			}
			const next = Object.assign( {}, fe );
			moved.forEach( ( k ) => {
				if ( now[ k ] ) {
					next[ k ] = now[ k ];
				} else {
					delete next[ k ];
				}
			} );
			return Object.keys( next ).length ? next : null;
		} );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ details, consent, customValues ] );

	const backToDateTimeRefresh = useCallback(
		( toastPayload ) => {
			setStep( 'datetime' );
			setSelectedSlotUtc( null );
			setSubmitting( false );
			if ( toastPayload ) {
				setToast( toastPayload );
				// QA D14: the toast fades in seconds; this stays on Date & time until the visitor
				// picks another time, so nobody who looked away is left wondering why.
				setSlotTakenNotice( true );
			}
			fetchAvailability( cal.year, cal.month, displayTz );
		},
		[ cal.year, cal.month, displayTz, fetchAvailability ]
	);

	/**
	 * `409 aponto_slot_taken` while a NAMED staff member is selected (D-R50 fix round 1).
	 *
	 * The ordinary recovery — back to Date & time, toast, refetch — is right when the slot was
	 * simply taken by somebody else. It is a LOOP when the reason is the staff member: archived, or
	 * unassigned from the service, mid-flow. The server refuses under the lock, the widget
	 * refetches the same `staff_id`, and (before the engine fix in this round, and still for the
	 * unassigned case the instant it happens) gets slots back and offers the same dead end.
	 *
	 * So on a 409 with a named choice the catalogue is RE-READ, which is the only authority on
	 * who is still eligible. If the staff member has gone from the selected service's `staff_ids`,
	 * the choice is cleared and the customer is put back where the question is asked — the
	 * Staff step if it still applies, otherwise Date & time on the any-staff calendar. The
	 * toast is the existing one: from the customer's side this IS "that time is no longer
	 * available", and naming staff churn at them would be the business's laundry.
	 *
	 * A block PRESET `staffId` is deliberately NOT touched: the site owner pinned it, the widget
	 * has no mandate to un-pin it, and the engine fix above already makes that calendar empty.
	 *
	 * D-R62 extends the same reasoning to the LOCATION: a branch archived, or no longer offering
	 * the service, mid-flow refuses the reserve the same way. So the catalogue is also re-read
	 * whenever a non-preset location is in play; a CHOSEN location that has left the service's
	 * `location_ids` is cleared and the customer goes back to the Location step (or on, when the
	 * step no longer applies). The location is checked FIRST, because it comes first in the flow
	 * and staff eligibility is asked at it. A preset `locationId` is never un-pinned.
	 */
	/**
	 * Re-read `/public/services` and hand the result to a recovery (D-R62 dedupe of the three
	 * identical re-reads the `409`, `staff_id` and `location_id` recoveries each carried).
	 *
	 * The catalogue state is replaced with the fresh one, the SELECTED service is swapped for its
	 * fresh copy when it still exists, and `onFresh( fresh, next )` decides where the customer
	 * goes — `fresh` is null when the service itself left the catalogue.
	 *
	 * @param {Function} onFresh  `( fresh: ?Object, next: Object ) => void`.
	 * @param {Function} [onFail] Called when the re-read fails.
	 */
	function rereadCatalogue( onFresh, onFail ) {
		const picked = service;
		api.getServices().then(
			( res ) => {
				const next = shapeCatalogue( res );
				setCatalogue( ( c ) =>
					Object.assign( {}, c, {
						loading: false,
						error: false,
						services: next.services,
						categories: res.categories || [],
						staff: next.staff,
						locations: next.locations,
					} )
				);
				const fresh = picked
					? next.services.find( ( s ) => s.id === picked.id ) || null
					: null;
				if ( fresh ) {
					setService( fresh );
				}
				onFresh( fresh, next );
			},
			onFail || ( () => {} )
		);
	}

	/**
	 * Whether the location this booking was going to has been LOST in a refreshed catalogue
	 * (D-R62 fix round 1): a CHOSEN branch that no longer offers the service, or a silently
	 * ASSIGNED one that became ambiguous because the service is now offered at ≥2 places — in
	 * both cases the next request would carry no usable `location_id`, and the only honest move
	 * is to ask again. A block preset is never lost.
	 *
	 * @param {Object} fresh The service, re-read.
	 * @param {Object} next  The re-read catalogue.
	 * @return {boolean} Whether the location has to be asked for again.
	 */
	function locationLost( fresh, next ) {
		if ( config.locationId ) {
			return false;
		}
		if (
			typeof locationChoice === 'number' &&
			! locationIdsFor( fresh, presetStaff ).includes( locationChoice )
		) {
			return true;
		}
		return (
			locationStepApplies(
				fresh,
				next.locations,
				config.locationId,
				presetStaff
			) && null === locationForIn( fresh, next, locationChoice )
		);
	}

	/**
	 * Whether the customer's STAFF answer survives a move to location `loc` (D-R62): "Any" always
	 * does, a named person only while they still do this service there, and "not asked yet"
	 * never counts as an answer.
	 *
	 * @param {Object}  fresh Service, re-read.
	 * @param {?number} loc   The location the booking now goes to.
	 * @return {boolean} Whether the staff answer is kept.
	 */
	function keepStaffAt( fresh, loc ) {
		if ( undefined === staffChoice ) {
			return false;
		}
		const kept =
			null === namedStaffId ||
			eligibleStaffFor( fresh, loc ).includes( namedStaffId );
		if ( ! kept ) {
			setStaffChoice( undefined );
		}
		return kept;
	}

	/**
	 * The first step that still needs an answer after the LOCATION was lost (D-R62 fix round 3):
	 * Location when the refreshed service is offered at ≥2 places; else Staff, only when the
	 * staff answer did not survive and there is a choice at the (silently assigned) branch; else
	 * Date & time — a slot has to be confirmed again at the new branch in every case.
	 *
	 * @param {Object}  fresh     Service, re-read.
	 * @param {Object}  next      Catalogue, re-read.
	 * @param {boolean} staffKept Whether the staff answer survived.
	 * @return {string} Step key.
	 */
	function resumeStepFor( fresh, next, staffKept ) {
		if (
			locationStepApplies(
				fresh,
				next.locations,
				config.locationId,
				presetStaff
			)
		) {
			return 'location';
		}
		if ( staffKept ) {
			return 'datetime';
		}
		return stepAfterLocation(
			fresh,
			next,
			locationForIn( fresh, next, undefined )
		);
	}

	function recoverFromSlotTaken( toastPayload ) {
		backToDateTimeRefresh( toastPayload );
		const locationInPlay = !! effectiveLocationId && ! config.locationId;
		if ( ( null === namedStaffId && ! locationInPlay ) || ! service ) {
			return;
		}
		rereadCatalogue( ( fresh, next ) => {
			const locationGone = !! fresh && locationLost( fresh, next );
			const loc = fresh
				? locationForIn(
						fresh,
						next,
						locationGone ? undefined : locationChoice
				  )
				: null;
			const staffGone =
				null !== namedStaffId &&
				! ( fresh && eligibleStaffFor( fresh, loc ).includes( namedStaffId ) );
			// "Any" and a named person who survived are both still answers (fix round 3).
			const staffKept = undefined !== staffChoice && ! staffGone;
			if ( ! locationGone && ! staffGone ) {
				// A silently assigned branch may still have MOVED (one place → another); the
				// derived id follows the new catalogue and the refetch effect repaints.
				return;
			}
			// The place or the person is gone. Drop the choice, invalidate the calendar it
			// produced, and ask again where asking belongs.
			invalidateAvailability();
			if ( locationGone ) {
				setLocationChoice( undefined );
			}
			if ( staffGone ) {
				setStaffChoice( undefined );
			}
			markNav();
			if ( ! fresh ) {
				setStep( 'datetime' );
			} else if ( locationGone ) {
				setStep( resumeStepFor( fresh, next, staffKept ) );
			} else {
				setStep( stepAfterLocation( fresh, next, loc ) );
			}
		} );
		// A failed re-read leaves the ordinary recovery in place rather than guessing: the
		// customer is on Date & time with a refreshed calendar either way.
	}

	/**
	 * `422 aponto_validation` with `fields.staff_id` — the site now says the customer MUST name
	 * a staff member (D-R52 `booking.staff_choice = required`; fix round 1, P2-1).
	 *
	 * Without this the visitor sat on Details with a generic validation banner and no control
	 * that could fix it: the choice they needed to change is two steps back, and the step they
	 * would return to still rendered the "Any available" row the server had just rejected. Three
	 * things have to happen together, and none of them is optional:
	 *
	 *  1. **Remember the refusal** (`staffRequiredBySrv`), because the page-global setting in
	 *     this tab is stale and would otherwise re-render the same dead end.
	 *  2. **Re-read the catalogue**, which is the only authority on who is eligible now — the
	 *     same re-read the `409` recovery does, for the same reason.
	 *  3. **Clear the choice and go back to the question**, so the customer answers it rather
	 *     than being told they got something wrong.
	 *
	 * If the refreshed catalogue publishes no roster for this service — the owner changed more
	 * than one thing, or the staff set shrank below two — there is nothing to ask, so the
	 * visitor lands on Date & time and the next submit goes through on any-staff.
	 */
	function recoverFromStaffRequired() {
		setStaffRequiredBySrv( true );
		setSubmitting( false );
		setSubmitError( null );
		setFieldErrors( null );
		setStaffChoice( undefined );
		invalidateAvailability();
		markNav();
		setToast( {
			title: sprintf( COPY.toast_staff_required_title, staffTermRef.current ),
			body: COPY.toast_staff_required_body,
		} );

		const fallback = () => setStep( service ? 'staff' : 'service' );
		if ( ! service ) {
			fallback();
			return;
		}
		rereadCatalogue(
			( fresh, next ) => {
				if ( ! fresh ) {
					setStep( 'datetime' );
				} else if ( locationLost( fresh, next ) ) {
					// The location has to be asked again first (D-R62 fix round 1): staff are
					// asked AT it, and a null `location_id` would only earn the next 422.
					setLocationChoice( undefined );
					setStep( stepAfterService( fresh, next, undefined ) );
				} else {
					setStep(
						stepAfterLocation(
							fresh,
							next,
							locationForIn( fresh, next, locationChoice )
						)
					);
				}
			},
			// The re-read failed. Send them to the step the refusal is about anyway: a stale
			// roster still names the people this service had a moment ago, and the alternative
			// is leaving them on Details with nothing to press.
			fallback
		);
	}

	/**
	 * The `service:location` pair a `422 fields.location_id` was last recovered for — the loop
	 * guard below (D-R62 fix round 1: keyed on the PAIR, because a silently assigned location is
	 * not null and a guard keyed on "no location sent" never fired for it).
	 */
	const locationRefusedRef = useRef( null );

	/**
	 * `422 aponto_validation` with `fields.location_id` — STALE CONFIGURATION (D-R62), the
	 * D-R52 `staff_id` shape.
	 *
	 * Two ways to get here: the page was loaded before the site started asking for a location
	 * (so this tab had no roster and sent `null`, which the server refuses while a roster is
	 * published — rest-contract §3.3 addendum 2026-09-23), or the location this booking was
	 * going to stopped serving the service mid-flow. The catalogue is re-read (the only
	 * authority on where the service is offered) and then exactly one of two things happens:
	 *
	 *  - **the refreshed catalogue has a question to ask** (the service is offered at ≥2 places)
	 *    ⇒ clear the choice, invalidate the calendar and go to the Location step with the "pick
	 *    a location" toast;
	 *  - **it has none** (one branch left — assigned silently — or no roster at all) ⇒ still
	 *    LEAVE Details (fix round 3, browser QA L12): the slot belonged to the refused branch and
	 *    may not exist at the new one, so the customer goes back to the first step that needs an
	 *    answer — Staff only if their staff choice did not survive, else Date & time with a
	 *    calendar re-read for the new branch — under a neutral "form was updated" toast, and
	 *    confirms a time again. Staying on Details let a second click book a different branch
	 *    with nobody having looked at it. (With no roster the pre-reserve summary cannot name the
	 *    new branch — the server publishes nothing for a single location — so the confirmation's
	 *    `booking.location` is the first place it is named.)
	 *
	 * The "refresh the page" banner is kept for the SECOND refusal of the same `service:location`
	 * pair (and for a failed re-read), because until then the form has refreshed itself — and
	 * that same guard is why a server and a catalogue that disagree cannot produce a lap: every
	 * further POST is the customer's own press. A block PRESET `locationId` is never
	 * un-pinned — including a non-first branch on a `location_choice = first` site — so the
	 * server's message goes to the ordinary banner. A service that left the catalogue returns to
	 * the Service step, or to Date & time when there is no Service step to return to.
	 *
	 * @param {string} message The server's public-safe field message.
	 */
	function recoverFromLocationStale( message ) {
		setSubmitting( false );
		setFieldErrors( null );
		const text = message ? String( message ) : '';
		const staleBanner = () =>
			setSubmitError( { kind: 'validation_stale', message: text } );
		if ( config.locationId || ! service ) {
			setSubmitError( { kind: 'validation_general', message: text } );
			return;
		}
		const pair = service.id + ':' + ( effectiveLocationId || 0 );
		if ( locationRefusedRef.current === pair ) {
			staleBanner();
			return;
		}
		locationRefusedRef.current = pair;
		setSubmitError( null );

		rereadCatalogue(
			( fresh, next ) => {
				// Everything derived from the refused location goes, whatever comes next: the
				// calendar and the slot belong to a branch this booking is no longer going to.
				invalidateAvailability();
				setLocationChoice( undefined );
				markNav();
				if ( ! fresh ) {
					// The service itself is gone: choosing one again is the only honest place
					// to resume — or Date & time when this form has no Service step.
					setStaffChoice( undefined );
					if ( serviceLocked ) {
						setStep( 'datetime' );
					} else {
						setService( null );
						setStep( 'service' );
					}
					return;
				}
				const staffKept = keepStaffAt(
					fresh,
					locationForIn( fresh, next, undefined )
				);
				const target = resumeStepFor( fresh, next, staffKept );
				setToast(
					'location' === target
						? {
								title: COPY.location_title,
								body: COPY.toast_location_body,
						  }
						: {
								title: COPY.toast_form_updated_title,
								body: COPY.toast_form_updated_body,
						  }
				);
				setStep( target );
			},
			() => {
				// The re-read failed. Ask the question if this tab can; otherwise the form did
				// NOT refresh itself, and the stale-form banner's "refresh" is the honest advice.
				if (
					locationStepApplies(
						service,
						catalogue.locations,
						config.locationId,
						presetStaff
					)
				) {
					invalidateAvailability();
					setLocationChoice( undefined );
					markNav();
					setToast( {
						title: COPY.location_title,
						body: COPY.toast_location_body,
					} );
					setStep( 'location' );
					return;
				}
				staleBanner();
			}
		);
	}

	// `attemptBooking` is a `useCallback` with a pinned dep list, so the recoveries are reached
	// through refs — a captured function would be one render stale exactly when it matters.
	const slotTakenRef = useRef( null );
	slotTakenRef.current = recoverFromSlotTaken;
	const staffRequiredRef = useRef( null );
	staffRequiredRef.current = recoverFromStaffRequired;
	const locationStaleRef = useRef( null );
	locationStaleRef.current = recoverFromLocationStale;
	// The customer-facing term, read from a ref for the same reason.
	const staffTermRef = useRef( '' );

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
				const res = await ( ctx.reserve ? ctx.reserve( body, key ) : api.createBooking( body, key ) );
				setSubmitError( null );
				return { ok: true, response: res };
			} catch ( raw ) {
				// The applied coupon stopped being available between quote and
				// submit: the seam drops the quote (full price again) and the
				// message lands ON the coupon field, on the step that owns it.
				const couponMsg = couponRef.current.handleBookingError( raw );
				if ( couponMsg ) {
					setFieldErrors( { [ couponRef.current.fieldKey ]: couponMsg } );
					setSubmitError( null );
					setSubmitting( false );
					setStep( 'details' );
					return { ok: false };
				}
				const info = classifyError( raw );
				if ( info.kind === 'validation' && info.fields?.[ 'payment.amount_mode' ] ) {
					setPayError( String( info.fields[ 'payment.amount_mode' ] ) );
					setSubmitting( false );
					return { ok: false };
				}
				switch ( info.kind ) {
					case 'slot_taken':
					case 'not_found':
						slotTakenRef.current( {
							title: COPY.toast_slot_taken_title,
							body: COPY.toast_slot_taken_body,
						} );
						break;
					case 'validation': {
						const mapped = mapFieldErrors( info.fields );
						const fieldKeys = Object.keys( mapped ).filter(
							( k ) =>
								k !== '__slot' &&
								k !== '__stale' &&
								k !== '__staff' &&
								k !== '__location'
						);
						if ( mapped.__location ) {
							// FIRST of all: the location comes first in the flow, and staff
							// eligibility is asked AT it, so answering it may settle the rest.
							locationStaleRef.current( mapped.__location );
						} else if ( mapped.__staff ) {
							// FIRST: this one is not about the time or the fields, it is about
							// a question the form stopped asking. Everything else in the same
							// 422 is re-validated on the way back through.
							staffRequiredRef.current();
						} else if ( mapped.__slot ) {
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
			if ( k === 'customer.first_name' || k === 'first_name' ) {
				out.first_name = msg;
			} else if ( k === 'customer.last_name' || k === 'last_name' ) {
				out.last_name = msg;
			} else if ( k === 'customer.email' || k === 'email' ) {
				out.email = msg;
			} else if ( k === 'customer.phone' || k === 'phone' ) {
				out.phone = msg;
			} else if ( k === 'consent' ) {
				out.consent = msg;
			} else if ( coupon.fieldKey && k === coupon.fieldKey ) {
				out[ k ] = msg;
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
			} else if ( k === 'location_id' ) {
				// Stale configuration, not a customer mistake (D-R62): the site's location
				// roster changed under this tab. Its own recovery, like `staff_id` below.
				out.__location = msg;
			} else if ( k === 'staff_id' ) {
				// Not a field on THIS step and not a mistake the customer made: the site's
				// staff-selection policy changed under them (D-R52 `required`). It gets its own
				// recovery rather than a banner (fix round 1, P2-1).
				out.__staff = msg;
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
		reservedOrderRef.current = null;
		setReservedOrder( null );
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
		reservedOrderRef.current = null;
		setReservedOrder( null );
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
			status === 'paid' || status === 'partial' ||
			( status === 'pending' && ( ! failure || unverified ) )
		) {
			clearHold( orderCode );
			idem.reset();
			finishBooking( mergeBookingStatus( out.response, state ), {
				status: unverified ? 'unverified' : status === 'partial' ? 'paid' : status,
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
		reservedOrderRef.current = null;
		setReservedOrder( null );
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
				order: { ...res.booking?.order, ...state.order },
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
			const order = res.response.booking?.order;
			if ( order ) {
				const previous = reservedOrderRef.current || paymentTerms;
				reservedOrderRef.current = order;
				setReservedOrder( order );
				// Pause before the gateway confirmation when the reserved snapshot changed.
				if ( Number.isInteger( order.payable_now_minor ) && ( ( previous?.payable_now_minor ?? effectiveTotalMinor ) !== order.payable_now_minor || ( previous?.total_minor ?? effectiveTotalMinor ) !== order.total_minor ) ) {
					setSubmitting( false );
					setPayNotice( { title: COPY.terms_changed, retry: true } );
					throw HANDLED;
				}
			}


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
		if ( submitting || submittingRef.current ) {
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
		// The gateway's own readiness check, before anything is reserved: a
		// refusal here costs the visitor no booking and no hold.
		let refusal;
		try {
			refusal = await gatewayPrecheck(
				gateways.find( ( g ) => g.code === draft.payment_method ),
				{ nonce: config.nonce }
			);
		} catch ( limited ) {
			// The pre-check was rate limited: nothing is reserved, and the visitor
			// gets the same "too many attempts" state as a limited booking POST.
			setSubmitting( false );
			setSubmitError( { kind: 'rate_limited' } );
			setRateSeconds(
				Math.max( 1, Math.ceil( Number( limited?.retryAfter ) || 30 ) )
			);
			return null;
		}
		if ( refusal ) {
			setSubmitting( false );
			setPayError( refusal );
			return null;
		}
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
		// Some checkout adapters expose their existing flow through the shared footer.
		const footerAdapter = step === 'payment' ? adaptersRef.current[ payMethod ] : null;
		if ( footerAdapter?.activate ) {
			if ( ! submitting && ! submittingRef.current && ! gatewayBusyRef.current ) { footerAdapter.activate(); }
			return;
		}
		if ( submitting || submittingRef.current ) {
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
				nonce: config.nonce,
				// The widget's half of the sequence, for a gateway that starts it
				// from its own control. Read through the ref on every call so a
				// button rendered once still reaches the current state.
				flow: {
					authorization: () => holdRef.current?.token,
					checkout: () => gatewayFlowRef.current.checkout(),
					confirm: ( ref ) =>
						gatewayFlowRef.current.confirm( gateway.code, ref ),
					settle: ( out ) =>
						gatewayFlowRef.current.settle( out, gateway.code ),
				},
				// MINOR units plus the ISO exponent: only the adapter knows its own
				// gateway's exponent, so only the adapter can do the conversion
				// (D-R39a). It refuses to mount rather than quote a rounded figure.
				amountMinor: payableMinor,
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
	}, [ step, payMethod, service, gateways, mountNonce, payableMinor ] );

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
			amountMinor: payableMinor,
			currencyExponent,
			scope: wrapRef.current,
		} );
	}, [ payMethod, service, config.appearance, currencyExponent, payableMinor ] );

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
								// The place the server booked (D-R62 fix round 1). Without it the
								// resumed confirmation had no "Where" and its Google Calendar
								// link fell back to the business NAME — the D-R61 bug again.
								...( booking.location
									? { location: booking.location }
									: {} ),
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
					status !== 'paid' && status !== 'partial' &&
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
					status: status === 'partial' ? 'paid' : status,
					// No amount survives the whitelist, and the confirm route
					// never carried one — so the line says what is known.
					amountLabel: '',
					orderCode: state.order_code || returnLeg.order,
				} );
				setMinimalConfirm( {
					confirmed: state.booking_status === 'confirmed',
					order: state.order,
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
		paymentChoice.reset();
		markNav();
		invalidateAvailability();
		setService( s );
		// A coupon was quoted for the PREVIOUS service's price and allow-list (D-R67): drop it.
		coupon.reset();
		// A staff member NAMED for the PREVIOUS service survives only if the new service is one
		// they actually do — otherwise it would post a `staff_id` the server rejects as
		// ineligible, and the customer would never have been shown the row (D-R50). Anything
		// else goes back to `undefined`: a fresh service is a fresh question.
		//
		// The LOCATION follows the same rule (D-R62): a place chosen for the previous service
		// survives only where the new service is offered, and the staff check is then asked at
		// whatever location the new service will actually be booked at.
		const keepLocation =
			typeof locationChoice === 'number' &&
			locationIdsFor( s, presetStaff ).includes(
				locationChoice
			);
		if ( ! keepLocation ) {
			setLocationChoice( undefined );
		}
		const nextChoice = keepLocation ? locationChoice : undefined;
		const stillEligible =
			null !== namedStaffId &&
			eligibleStaffFor(
				s,
				locationForIn( s, catalogue, nextChoice )
			).includes( namedStaffId );
		if ( ! stillEligible ) {
			setStaffChoice( undefined );
		}
		setStep( stepAfterService( s, catalogue, nextChoice ) );
	}

	/**
	 * Location → Staff or Date & time (D-R62). Auto-advances on pick, like a Service or Staff row.
	 *
	 * A different branch is a different calendar, so the day, the slot and the auto-pick flag
	 * go — and the fetch token is bumped HERE, synchronously, so an in-flight response for the
	 * previous branch cannot paint (the D-R50 fix (iii) rule). A NAMED staff member who does not
	 * work at the new branch is dropped, the same shape as a service change dropping one the new
	 * service does not have; and when only one staff member remains there, the Staff step is
	 * skipped (D-R60 rule 8).
	 *
	 * @param {number} id Location id.
	 */
	function selectLocation( id ) {
		markNav();
		if ( id !== locationChoice ) {
			invalidateAvailability();
		}
		setLocationChoice( id );
		if (
			null !== namedStaffId &&
			! eligibleStaffFor( service, id ).includes(
				namedStaffId
			)
		) {
			setStaffChoice( undefined );
		}
		setStep( stepAfterLocation( service, catalogue, id ) );
	}

	/**
	 * Staff → Date & time (D-R50). Auto-advances on pick, exactly like a service row.
	 *
	 * Everything derived from the previous staff member's calendar is dropped: a day and a slot
	 * that were free for Ana are not necessarily free for Bo, and the auto-pick flag has to
	 * re-arm or the first available day would stay on the old person's calendar.
	 *
	 * A first pick of "Any available" (`undefined` → `null`) changes no request, but it DOES
	 * change the step's own state, so it is still recorded — Back must show the row the customer
	 * chose.
	 *
	 * @param {?number} id Staff id, or null for "Any available".
	 */
	function selectStaff( id ) {
		markNav();
		setStaffProfile( null );
		if ( ( id || null ) !== ( staffChoice || null ) ) {
			invalidateAvailability();
		}
		setStaffChoice( id );
		setStep( 'datetime' );
	}

	/** Reserve once, then retry handoff against the same in-memory authorization. */
	async function continueExternalCheckout() {
		if ( ! externalCheckout || gatewayBusyRef.current || submitBlocked ) {
			return;
		}
		const errors = validateDetails();
		if ( errors ) {
			setFieldErrors( errors );
			return;
		}
		if ( honeypot ) {
			setSubmitError( { kind: 'guard' } );
			return;
		}
		setFieldErrors( null );
		setSubmitError( null );
		setSubmitting( true );
		markGatewayBusy( true );
		try {
			// Asked before the reserve AND before every retry of the handoff, so a
			// refusal never costs a hold the visitor did not get to use.
			const refusal = await gatewayPrecheck( gateways[ 0 ], {
				nonce: config.nonce,
			} );
			if ( ! externalMounted.current ) {
				return;
			}
			if ( refusal ) {
				setSubmitError( {
					kind: 'external_checkout',
					title: externalCheckout.errorTitle,
					body: refusal,
				} );
				return;
			}
			if ( ! externalAttempt.current ) {
				const draft = buildDraft();
				const begun = await beginWithRetry(
					buildBody( draft ),
					idem.keyFor( draft ),
					{
						draft,
						lockRetried: false,
						inflightTries: 0,
						conflictRetried: false,
						reserve: externalCheckout.deferIdentity
							? ( body, key ) => externalCheckout.reserve( body, key, config )
							: undefined,
					}
				);
				if ( ! externalMounted.current ) {
					return;
				}
				if (
					begun.payment?.status !== 'begin' ||
					! begun.payment.gateway_ref
				) {
					setSubmitError( { kind: 'network' } );
					return;
				}
				externalAttempt.current = begun;
				setExternalReserved( true );
			}
			await externalCheckout.handoff( {
				nonce: config.nonce,
				payment: externalAttempt.current.payment,
				token: holdRef.current?.token,
				isCurrent: () => externalMounted.current,
			} );
		} catch ( error ) {
			if ( externalMounted.current && error !== HANDLED ) {
				if ( error?.code === 'aponto_rate_limited' ) {
					setSubmitError( { kind: 'rate_limited' } );
					setRateSeconds(
						Math.max(
							1,
							Math.ceil( Number( error.retryAfter ) || 30 )
						)
					);
				} else {
					setSubmitError(
						externalAttempt.current
							? {
									kind: 'external_checkout',
									title: externalCheckout.errorTitle,
									// The gateway's own sentence when it sent one the
									// visitor can act on; our copy otherwise.
									body:
										( error?.code === 'aponto_payment_state' &&
											error.message !== error.code &&
											publicRefusal( error.message ) ) ||
										( holdRef.current?.token
											? externalCheckout.errorBody
											: externalCheckout.recoveryBody ),
							  }
							: { kind: 'network' }
					);
				}
			}
		} finally {
			if ( externalMounted.current ) {
				setSubmitting( false );
				markGatewayBusy( false );
			}
		}
	}

	function goToDetails() {
		if ( externalCheckout?.deferIdentity && ! customFields.length && ! consentEnabled ) {
			continueExternalCheckout();
			return;
		}
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
			return paymentMode === 'optional';
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

	/** Staff → back one step: Location when it exists, otherwise Service (D-R62). */
	function backFromStaff() {
		markNav();
		releaseHold();
		setStep( locationStepExists ? 'location' : 'service' );
	}

	/**
	 * Date & time → back one step: Staff when it exists, then Location (D-R62), otherwise
	 * Service (D-R50).
	 */
	function backFromDateTime() {
		markNav();
		releaseHold();
		if ( staffStepExists ) {
			setStep( 'staff' );
		} else {
			setStep( locationStepExists ? 'location' : 'service' );
		}
	}

	function backToDateTime() {
		markNav();
		releaseHold();
		setStep( 'datetime' );
	}

	/**
	 * The one-page intro's "Change time" (D-R80): Details or Payment → Date & time, every typed
	 * detail kept. From Payment it is Back-to-Details plus one more step, under the same guard:
	 * never while a gateway owns an attempt, and the hold goes with it.
	 */
	function changeTime() {
		if ( gatewayBusyRef.current ) {
			return;
		}
		setPayError( '' );
		setPayNotice( null );
		backToDateTime();
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

	/**
	 * Rail navigation (founder review 2026-09-30): a DONE step on the progress rail jumps back
	 * to it, exactly like the Back buttons do — mark navigation, release any hold, keep every
	 * choice. Never forward, and never from Payment (a live hold a gateway may be capturing
	 * against) or Confirmation (the booking exists).
	 *
	 * @param {number} index 0-based rail index.
	 */
	function jumpToStep( index ) {
		const key = stepList[ index ];
		if ( ! key || index + 1 >= stepIndex || gatewayBusyRef.current ) {
			return;
		}
		markNav();
		releaseHold();
		setStep( key );
	}

	/** Back to the Service step with a clean slate (D-R79's paid-unavailable stop only). */
	function changeService() {
		markNav();
		releaseHold();
		invalidateAvailability();
		setService( null );
		coupon.reset();
		setStaffChoice( undefined );
		setLocationChoice( undefined );
		setStep( 'service' );
	}

	function bookAnother() {
		paymentChoice.reset();
		markNav();
		idem.reset();
		holdRef.current = null;
		reservedOrderRef.current = null;
		setReservedOrder( null );
		// A resume leg is over once its booking is: the next booking is an ordinary one, with
		// no inherited Payment step and no stale `/pay` response to confirm (fix round 2).
		resumeRef.current = null;
		setResume( null );
		selectMethod( null );
		setPayError( '' );
		setPayNotice( null );
		setPayResult( null );
		setPayIncomplete( null );
		setMinimalConfirm( null );
		setGatewayReady( false );
		markGatewayBusy( false );
		setResponse( null );
		setDetails( {
			first_name: '',
			last_name: '',
			email: '',
			phone: '',
			note: '',
		} );
		setConsent( false );
		setCustomValues( {} );
		coupon.reset();
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
		setStaffChoice( undefined );
		setLocationChoice( undefined );
		locationRefusedRef.current = null;
		if ( only ) {
			// The auto-pick effect re-selects the first available day.
			setService( only );
			setStep( stepAfterService( only, catalogue, undefined ) );
		} else {
			setService( null );
			setStep( 'service' );
		}
	}

	// --- Derived layout data. -------------------------------------------------
	// Honest numbering: the Payment step is IN the list only when this booking
	// actually has one, so a free service on a paying site reads `01 / 04` and a
	// paid one `01 / 05` — and a preselected service drops one from either.
	// --- Staff step presentation (D-R52). --------------------------------------
	// Page-global settings, already normalized and already merged with the block's own
	// `staffLayout` override by `resolveConfig()`, so there is exactly one place to read.
	// `|| STAFF_DEFAULTS` is not defensive clutter: `App` is also mounted by hosts that build a
	// config object by hand (the dev harness, the jsdom tests), and the shipped defaults are the
	// only honest answer to "the page said nothing".
	const staffDisplay = config.staff || STAFF_DEFAULTS;
	// The site's own word for a staff member, or the neutral translated default. Operator text,
	// rendered through `sprintf` into a TEXT node — never markup.
	const staffTerm = staffDisplay.label || COPY.staff_term;
	staffTermRef.current = staffTerm;
	/**
	 * What the Staff step actually renders with: the site's own settings, unless the SERVER has
	 * already refused an unnamed booking in this session, in which case `required` wins whatever
	 * the (now stale) page-global says (fix round 1, P2-1). One object, so no consumer can read
	 * the stale value by accident.
	 */
	const staffView = staffRequiredBySrv
		? Object.assign( {}, staffDisplay, { choice: 'required' } )
		: staffDisplay;

	/**
	 * Return focus to the "Learn more" that opened the dialog, once it has closed.
	 *
	 * In an EFFECT rather than in the close handler because the card behind carries `inert`
	 * until the closing render commits, and focusing a still-inert element is a no-op. When the
	 * dialog closed because the visitor pressed "Book with …" the step has already changed, so
	 * the trigger is detached and `isConnected` declines the focus — which is right: the new
	 * step's heading owns focus there.
	 */
	useEffect( () => {
		if ( staffProfile ) {
			profileReturnRef.current = staffProfile.trigger;
			return;
		}
		const back = profileReturnRef.current;
		profileReturnRef.current = null;
		if ( back && back.isConnected ) {
			back.focus();
		}
	}, [ staffProfile ] );

	// The Location step (D-R62) sits between Service and Staff (D-R60 order), and the Staff
	// step (D-R50) between it and Date & time. Each `*InList` owns the denominator rule for the
	// Service step, where no service is picked yet; the Staff step's is asked AT the effective
	// location, so picking a branch where one person works drops it from the count.
	const locationStepExists = locationStepInList(
		service,
		catalogue,
		config.locationId,
		presetStaff
	);
	const staffStepExists = staffStepInList(
		service,
		catalogue,
		config.staffId,
		service
			? effectiveLocationId
			: ( s ) => locationForIn( s, catalogue, undefined )
	);
	const stepList = [];
	if ( ! serviceLocked ) {
		stepList.push( 'service' );
	}
	if ( locationStepExists ) {
		stepList.push( 'location' );
	}
	if ( staffStepExists ) {
		stepList.push( 'staff' );
	}
	stepList.push( 'datetime' );
	if ( ! externalCheckout?.deferIdentity || customFields.length || consentEnabled ) { stepList.push( 'details' ); }
	if ( paymentStepExists ) {
		stepList.push( 'payment' );
	}
	stepList.push( 'confirmation' );
	const stepCount = stepList.length;
	const stepIndex = stepList.indexOf( step ) + 1;

	/**
	 * The macro progress rail's labels (D-R53), or `null` while the block asks for the
	 * fraction — which is the default and therefore almost every block.
	 *
	 * Built from the SAME `stepList` the fraction's denominator comes from, so the rail cannot
	 * drift from the number: the Staff and Payment steps appear only when this booking really
	 * has them, and a preselected service drops Service from both. The Staff label follows the
	 * site's own word for a staff member (D-R52), capitalised — a salon that says "stylist"
	 * everywhere else should not meet the word "Staff" here.
	 */
	const progress = useMemo( () => {
		if ( 'horizontal' !== config.stepDisplay ) {
			return null;
		}
		const term = staffDisplay.label;
		const staffLabel = term
			? [ ...term ][ 0 ].toUpperCase() + [ ...term ].slice( 1 ).join( '' )
			: COPY.step_staff;
		const labels = {
			service: COPY.step_service,
			location: COPY.step_location,
			staff: staffLabel,
			datetime: COPY.step_datetime,
			details: COPY.step_details,
			payment: COPY.step_payment,
			confirmation: COPY.step_confirmation,
		};

		return {
			display: 'horizontal',
			steps: stepList.map( ( key ) => labels[ key ] || key ),
		};
		// `stepList` is rebuilt every render by design (it is derived state, not stored), so
		// the memo keys on its JOINED form rather than on the array identity.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ config.stepDisplay, staffDisplay.label, stepList.join( ',' ) ] );
	// The rail with its navigation attached — only where jumping back is safe (see jumpToStep).
	const railNav =
		progress && step !== 'payment' && step !== 'confirmation'
			? { ...progress, onJump: jumpToStep }
			: progress;
	// Two summary surfaces, two rules (D-R49). `inFlow` is the pre-D-R49 condition:
	// a step past Service with a service in hand.
	//  - showAside: the sidebar COLUMN exists in the grid (CSS reveals it at ≥700px
	//    containers). `always` adds the Service step — with nothing picked the
	//    Summary renders its empty state — so the content column is the same width
	//    on every step. Not over a failed or empty catalogue: "Start with a
	//    service" beside "No services available" would be a lie.
	//  - showRecap: the in-flow recap bar. Never on a Service step with nothing
	//    selected — there is nothing to recap. With `off` it is the only summary
	//    surface, so CSS keeps it at every width (`.ap-recap.solo`).
	const summaryMode = SUMMARY_MODES.includes( config.summaryMode )
		? config.summaryMode
		: 'always';
	// The Staff step is past Service with a service in hand, so it is IN the flow for
	// both summary surfaces — the sidebar stays on and the recap keeps recapping (D-R49).
	const inFlow =
		( step === 'location' ||
			step === 'staff' ||
			step === 'datetime' ||
			step === 'details' ||
			step === 'payment' ) &&
		!! service;
	const asideOnService =
		summaryMode === 'always' &&
		step === 'service' &&
		! catalogue.error &&
		( catalogue.loading || catalogue.services.length > 0 );
	const showAside = summaryMode !== 'off' && ( inFlow || asideOnService );
	const showRecap = inFlow || ( asideOnService && !! service );
	const years = useMemo( () => {
		const y = initialYear;
		return [ y, y + 1 ];
	}, [ initialYear ] );

	/**
	 * The one-page frame (D-R80, block `layout: 'one-page'`): the SAME step machine in a second
	 * presentation — an intro panel in the first column, the active screen beside it, no rail,
	 * no fraction. It needs a LOCKED service (a resolvable preset, or the
	 * lone active service); anything else — no preset on a multi-service site, a preset the
	 * catalogue no longer lists beside ≥2 services, a failed catalogue — is the default wizard,
	 * exactly as today. While the catalogue loads, a block with a PRESET shows the frame's own
	 * skeleton, so it never flashes the catalogue or the summary's empty state; a block without
	 * one keeps the default loading frame until the catalogue says whether a lone service locks
	 * it (fix round 1: painting the one-page skeleton there and then flipping to the wizard on a
	 * multi-service site was the flash this rule exists to avoid). `summaryMode` and
	 * `stepDisplay` have no meaning here and are ignored.
	 */
	const lockedService = serviceLocked
		? service ||
		  ( preselectedId
				? catalogue.services.find( ( s ) => s.id === preselectedId )
				: null ) ||
		  ( singleService ? catalogue.services[ 0 ] : null )
		: null;
	const onePage =
		'one-page' === config.layout &&
		( ( catalogue.loading && !! preselectedId ) || !! lockedService );
	// Numbering is wizard chrome: the one-page frame passes none, which is how StepHeader,
	// StepRail and the confirmation panels already render a plain heading.
	const shownIndex = onePage ? null : stepIndex;
	const shownCount = onePage ? null : stepCount;
	const shownProgress = onePage ? null : railNav;

	// The NAME behind `staffChoice`, or '' for "Any available" and for every site with no
	// roster. A block preset deliberately does NOT produce a name: it is the site owner's
	// pin, not the customer's choice, and it never showed in the summary before (D-R50).
	const namedStaffMember = useMemo( () => {
		if ( null === namedStaffId ) {
			return null;
		}
		return (
			( catalogue.staff || [] ).find( ( m ) => m.id === namedStaffId ) ||
			null
		);
	}, [ namedStaffId, catalogue.staff ] );

	const staffName = namedStaffMember ? namedStaffMember.name : '';
	// The visitor answered the Staff step with "Any available" (`null`, as opposed to
	// `undefined` = not answered). The summary names that choice instead of going silent
	// right after the visitor made it (founder review 2026-09-30). Only reachable where the
	// step exists, so a Free or single-staff summary is unchanged (D-R50).
	const staffAny = null === staffChoice && stepList.includes( 'staff' );

	/**
	 * The roster entry behind `effectiveLocationId` — chosen, silently assigned or preset — for
	 * the pre-reserve summary (D-R62). `null` on every site with no location roster, which keeps
	 * their summary byte-identical; a preset the roster does not name has nothing to print yet
	 * and is answered by the server on the confirmation instead.
	 */
	const summaryLocation = useMemo( () => {
		if ( ! effectiveLocationId ) {
			return null;
		}
		return (
			( catalogue.locations || [] ).find(
				( l ) => l.id === effectiveLocationId
			) || null
		);
	}, [ effectiveLocationId, catalogue.locations ] );

	/**
	 * What the CONFIRMATION prints under "Where" (D-R62).
	 *
	 * The SERVER's `booking.location` wins — it is the place the reserve actually booked, while
	 * the roster in this tab may be stale. Its `id` (fix round 2, rest-contract §3.3) says whether
	 * that is a real branch (`> 0`) or the business fallback (`0`, also what an older server with
	 * no `id` means), so:
	 *  - a real branch is ALWAYS printed — including one the server assigned silently on a
	 *    single-location site that sent no `location_id`, and a resume leg, which never loaded
	 *    a catalogue. (The pre-reserve summary stays silent there: without a roster the widget
	 *    has nothing to name before the reserve.)
	 *  - the business fallback is printed only when this booking had a location in play and the
	 *    response is older than that `id` — otherwise the roster entry is the fallback; a Free
	 *    booking (`id` 0, nothing in play) prints nothing, exactly as before.
	 */
	// The summary's "Questions? Call …" number (founder review 2026-09-30): the chosen branch's
	// own phone when it has one, else the business phone; '' prints nothing.
	const contactPhone = config.contactHelp
		? ( summaryLocation && summaryLocation.phone ) || config.business.phone || ''
		: '';

	const confirmLocation = useMemo( () => {
		const booked =
			response && response.booking ? response.booking.location : null;
		const named =
			booked && typeof booked.name === 'string' && '' !== booked.name
				? {
						name: booked.name,
						address:
							typeof booked.address === 'string'
								? booked.address
								: '',
				  }
				: null;
		if ( named && parseInt( booked.id, 10 ) > 0 ) {
			return named;
		}
		if ( resume || ! effectiveLocationId ) {
			return null;
		}
		return named || summaryLocation;
	}, [ effectiveLocationId, response, summaryLocation, resume ] );

	// The job title beside that name (D-R51). Empty for Any, for a block preset and for every
	// site that has not filled one in — the summary line then reads exactly as it did under
	// D-R50.
	const staffTitle = namedStaffMember ? namedStaffMember.title || '' : '';

	/**
	 * The name the CONFIRMATION prints (D-R50 fix round 1, Amelia/LatePoint comparison).
	 *
	 * Once a site publishes a roster, "Any available" has a concrete answer the moment the
	 * booking commits, and the customer is entitled to it: the panel names whoever the server
	 * actually assigned, read from the booking response rather than from the widget's own choice.
	 * The PRE-reserve summary still shows nothing for Any, because before the reserve there is no
	 * honest answer to give. A site with no roster (Free, single-staff Premium) prints nothing at
	 * all, exactly as it did before this feature existed.
	 */
	const confirmStaff = useMemo( () => {
		if ( staffName ) {
			return { name: staffName, title: staffTitle };
		}
		if ( ! ( catalogue.staff || [] ).length ) {
			return { name: '', title: '' };
		}
		const assigned = response && response.booking && response.booking.staff;
		if ( ! assigned || typeof assigned.name !== 'string' ) {
			return { name: '', title: '' };
		}
		return {
			name: assigned.name,
			// `title` is OMITTED from the post-booking staff object when the site left it
			// empty (D-R51), so the `typeof` guard is what an absent key looks like here.
			title: typeof assigned.title === 'string' ? assigned.title : '',
		};
	}, [ staffName, staffTitle, catalogue.staff, response ] );
	const confirmStaffName = confirmStaff.name;
	const confirmStaffTitle = confirmStaff.title;

	const submitBanner = useMemo( () => {
		if ( ! submitError ) {
			return null;
		}
		switch ( submitError.kind ) {
			case 'external_checkout':
				return <Banner variant="err" title={ submitError.title } body={ submitError.body } />;
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
		// D-R79 (opt-in site setting): online payment is required, no payment method is ready and
		// the owner chose not to take paid bookings unpaid. The catalogue still lists the service;
		// choosing a PAID one stops here, with the business's number when the form shows it. Free
		// services go on as usual, and `POST /public/bookings` enforces the same rule.
		if (
			payments.paidUnavailable &&
			! resume &&
			! response &&
			step !== 'service' &&
			step !== 'confirmation' &&
			service &&
			Number( service.price_minor ) > 0
		) {
			return (
				<div>
					<Banner
						variant="err"
						title={ COPY.paid_unavailable_title }
						body={ [ COPY.paid_unavailable_body, contactPhone ]
							.filter( Boolean )
							.join( ' ' ) }
					/>
					{ /* A preset block never offers another service (D-R83). */ }
					{ catalogue.services.length > 1 && ! serviceLocked ? (
						<div class="ap-foot">
							<span />
							<button
								type="button"
								class="ap-primary"
								onClick={ changeService }
							>
								{ COPY.change_service }
							</button>
						</div>
					) : null }
				</div>
			);
		}
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
					stepIndex={ shownIndex }
					progress={ shownProgress }
					stepCount={ shownCount }
					focusOnMount={ navigatedRef.current }
					onSelect={ selectService }
				/>
			);
		}

		if ( step === 'location' && service ) {
			const offered = locationIdsFor( service, presetStaff )
				.map( ( id ) =>
					( catalogue.locations || [] ).find( ( l ) => l.id === id )
				)
				.filter( Boolean );
			return (
				<LocationStep
					locations={ offered }
					selectedId={ locationChoice }
					stepIndex={ shownIndex }
					progress={ shownProgress }
					stepCount={ shownCount }
					focusOnMount={ navigatedRef.current }
					onSelect={ selectLocation }
					onBack={ serviceLocked ? null : backToService }
				/>
			);
		}

		if ( step === 'staff' && service ) {
			// Asked AT the effective location (D-R62): a branch shows only the people who work
			// there.
			const eligible = eligibleStaffFor( service, effectiveLocationId )
				.map( ( id ) =>
					( catalogue.staff || [] ).find( ( m ) => m.id === id )
				)
				.filter( Boolean );
			return (
				<StaffStep
					staff={ eligible }
					selectedId={ staffChoice }
					display={ staffView }
					term={ staffTerm }
					stepIndex={ shownIndex }
					progress={ shownProgress }
					stepCount={ shownCount }
					focusOnMount={ navigatedRef.current }
					onSelect={ selectStaff }
					onOpenProfile={ ( member, trigger ) =>
						setStaffProfile( { member, trigger } )
					}
					onBack={
						serviceLocked && ! locationStepExists
							? null
							: backFromStaff
					}
				/>
			);
		}

		if ( step === 'datetime' && service ) {
			return (
				<DateTimeStep
					locale={ config.locale }
					displayTz={ displayTz }
					businessTz={ businessTz }
					showTzNote={ showTzNote }
					tzOptions={ tzOptions }
					tzSuggested={ tzSuggested }
					calYear={ cal.year }
					calMonth={ cal.month }
					onMonth={ ( year, month ) => {
						// The VISITOR is paging: never skip the month they chose, even an empty one
						// (D-R64 item 4), and the "first month with times" notice no longer applies.
						autoAdvance.current.armed = false;
						carriedRef.current = false;
						setMonthNotice( '' );
						setSelectedDayKey( null );
						setSelectedSlotUtc( null );
						setCal( { year, month } );
					} }
					monthNotice={ monthNotice }
					availabilityIndex={ avail.index }
					availLoading={ avail.loading }
					availError={ avail.error }
					onRetryAvail={ () =>
						fetchAvailability(
							cal.year,
							cal.month,
							displayTz,
							autoAdvance.current.armed && ! ( selectedSlotUtc && selectedDayKey )
						)
					}
					todayKey={ dayKeyInTz( Date.now(), displayTz ) }
					years={ years }
					selectedDayKey={ selectedDayKey }
					onSelectDay={ ( key ) => {
						// A pick made while a zone change is still re-reading is the visitor's
						// own: the carried-selection check must not move it.
						carriedRef.current = false;
						setSelectedDayKey( key );
						setSelectedSlotUtc( null );
					} }
					selectedSlotUtc={ selectedSlotUtc }
					onSelectSlot={ ( utc ) => {
						setSlotTakenNotice( false );
						setSelectedSlotUtc( utc );
					} }
					heldStarts={ heldStarts( checkout.session, service, effectiveStaffId ) }
					onChangeDisplayTz={ ( tz ) => {
						if ( tz === displayTz ) {
							return;
						}
						// A zone change KEEPS the chosen slot (founder 2026-10-04, option B;
						// persona QA 2026-10-05, T-096): it is a UTC instant, so only the calendar
						// day it falls on moves — and the calendar follows it when that day is in
						// another month (23:30 on the
						// 31st in New York is the 1st in Hanoi). With only a day chosen, the same
						// calendar date stays selected and its times are re-read in the new zone.
						const key = selectedSlotUtc
							? dayKeyInTz( selectedSlotUtc, tz )
							: selectedDayKey;
						// Same reason as `invalidateAvailability()`: the old zone's read is stale
						// from this click on, and its grouping must not render under the new day.
						fetchToken.current += 1;
						setAvail( ( a ) =>
							Object.assign( {}, a, { loading: true, error: false } )
						);
						setSelectedDayKey( key );
						carriedRef.current = !! key;
						if ( key ) {
							const year = Number( key.slice( 0, 4 ) );
							const month = Number( key.slice( 5, 7 ) ) - 1;
							if ( year !== cal.year || month !== cal.month ) {
								setCal( { year, month } );
							}
						}
						// Remembered for the next visit; picking the default again forgets it.
						rememberTz( tzInit.browserTz, tz === tzInit.displayTz ? '' : tz );
						setDisplayTz( tz );
					} }
					stepIndex={ shownIndex }
					progress={ shownProgress }
					stepCount={ shownCount }
					focusOnMount={ navigatedRef.current }
					onBack={
						serviceLocked && ! staffStepExists && ! locationStepExists
							? null
							: backFromDateTime
					}
					onContinue={ goToDetails }
					busy={ submitting }
					blocked={ submitBlocked }
					locked={ !! externalCheckout && ( externalReserved || submitting ) }
					banner={
						slotTakenNotice || externalCheckout ? (
							<>
								{ slotTakenNotice ? (
									<Banner
										variant="warn"
										title={ COPY.toast_slot_taken_title }
										body={ COPY.slot_taken_inline }
									/>
								) : null }
								{ externalCheckout ? submitBanner : null }
							</>
						) : null
					}
					primaryLabel={ externalCheckout?.deferIdentity && ! customFields.length && ! consentEnabled ? externalCheckout.label : COPY.continue }
				/>
			);
		}

		if ( step === 'details' ) {
			return (
				<DetailsStep
					identityEnabled={ ! externalCheckout?.deferIdentity }
					locked={ !! externalCheckout && ( externalReserved || submitting ) }
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
					extraField={
						! externalCheckout && coupon.fieldKey
							? { key: coupon.fieldKey, render: coupon.renderField }
							: null
					}
					honeypot={ honeypot }
					onHoneypot={ setHoneypot }
					fieldErrors={ fieldErrors }
					banner={ submitBanner }
					stepIndex={ shownIndex }
					progress={ shownProgress }
					stepCount={ shownCount }
					focusOnMount={ navigatedRef.current }
					onBack={ externalReserved ? null : backToDateTime }
					onSubmit={ externalCheckout ? continueExternalCheckout : paymentStepExists ? goToPayment : submit }
					primaryLabel={
						externalCheckout ? externalCheckout.label : paymentStepExists ? COPY.continue : COPY.book
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
					mode={ paymentMode }
					method={ payMethod }
					onMethod={ choosePayMethod }
					totalLabel={ totalLabel }
					paymentTerms={ paymentTerms }
					paymentChoice={ paymentChoice.render( { currency: service.currency, locale: config.locale, currencyExponent } ) }
					currency={ service.currency }
					locale={ config.locale }
					currencyExponent={ currencyExponent }
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
					stepIndex={ shownIndex }
					progress={ shownProgress }
					stepCount={ shownCount }
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
					staffName={ confirmStaffName }
					staffTitle={ confirmStaffTitle }
					locationName={ confirmLocation ? confirmLocation.name : '' }
					locationAddress={
						confirmLocation ? confirmLocation.address : ''
					}
					displayTz={ displayTz }
					locale={ config.locale }
					businessName={ config.business.name }
					currencyExponent={ currencyExponent }
					payment={ payResult }
					progress={ shownProgress }
					stepIndex={ shownIndex }
					stepCount={ shownCount }
					focusOnMount={ navigatedRef.current }
					onBookAnother={ bookAnother }
					// The one-page intro already says what and when (D-R80); the card would
					// say it twice. Only where the intro really carries the time.
					hideCard={ onePage && !! selectedSlotUtc }
				/>
			);
		}

		if ( step === 'confirmation' && minimalConfirm ) {
			return (
				<MinimalConfirmation
					confirmed={ minimalConfirm.confirmed }
					details={ minimalConfirm.details }
					order={ minimalConfirm.order }
					locale={ config.locale }
					payment={ payResult }
					progress={ shownProgress }
					stepIndex={ shownIndex }
					stepCount={ shownCount }
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
	// sidebar column is on, the content takes whatever it leaves (NO 660px cap —
	// capping it here left a dead gutter beside the sidebar at ≥900px containers);
	// a sidebar-less Service step (summaryMode `step2`/`off`) is the 820px
	// catalogue; every other sidebar-less step (Confirmation, and all of `off`)
	// keeps the narrow 660px cap.
	const mainClass =
		'ap-main' +
		( showAside ? '' : step === 'service' ? ' service' : ' narrow' );

	const [ recapOpen, setRecapOpen ] = useState( false );

	/**
	 * Who the one-page intro says the visitor will meet (D-R85), ONE source per case:
	 *
	 *  - the visitor named somebody on the Staff step → that roster entry (the `/public/services`
	 *    roster, under its own D-R52 gates — the same person the step just showed them);
	 *  - on the confirmation of an "Any available" booking → the person the SERVER assigned
	 *    (`booking.staff`, already printed by the confirmation today), pictured with the face
	 *    the block or the roster published for that name, if any;
	 *  - otherwise → the block's server-resolved `host` (a preset or sole person, or the team);
	 *  - the block's switch off, or nothing publishable → no line.
	 *
	 * @param {boolean} done On the confirmation, with a booking response.
	 * @return {?Object} Host view for `IntroPanel`.
	 */
	function introHost( done ) {
		if ( ! config.showHost ) {
			return null;
		}
		const server = confirmedHost( config.host || null );
		if ( namedStaffMember ) {
			return { kind: 'person', member: namedStaffMember };
		}
		if ( done && confirmStaffName ) {
			// Matched by ID against the public roster, never by display name (review fix round
			// 1, P3): a staff member the roster does not carry — hidden (`is_public = 0`) but
			// assigned by any-staff — gets initials, and only the name, its parts and the title
			// `booking.staff` already discloses on this confirmation today (`staffObject()`).
			const assigned = ( response.booking && response.booking.staff ) || {};
			const id = parseInt( assigned.id, 10 );
			const known =
				id > 0
					? ( catalogue.staff || [] ).find( ( m ) => m.id === id ) || null
					: null;
			return {
				kind: 'person',
				member: {
					name: confirmStaffName,
					first_name: known
						? known.first_name
						: normalizePart( assigned.first_name ),
					last_name: known
						? known.last_name
						: normalizePart( assigned.last_name ),
					title: confirmStaffTitle,
					avatar: known ? known.avatar : null,
				},
			};
		}
		if ( ! server ) {
			return null;
		}
		return 1 === server.total && ! server.others
			? { kind: 'person', member: server.members[ 0 ] }
			: {
					kind: 'team',
					members: server.members,
					total: server.total,
					others: server.others,
			  };
	}

	/**
	 * The block's server-rendered host, as far as the data in hand still CONFIRMS it (D-R85 review
	 * fix rounds 1–2, P2):
	 *
	 *  - with a public roster in hand (Premium `multi_staff` + a Staff choice) the line is ALWAYS
	 *    rebuilt from it by ID, at the CURRENT effective location — the same per-(service, location)
	 *    map the Staff step reads — so picking a branch narrows it to the people who work there,
	 *    switching branches follows, no branch yet is the union (exactly what the page rendered),
	 *    and after a re-read a member who left drops out; a preset staff member the roster no
	 *    longer lists, or nobody eligible, is no line. The page's `others` flag (hidden colleagues
	 *    any-staff may assign) is carried over — the roster cannot know about them;
	 *  - with no roster to compare (Free, single staff, `staff_choice = any`), the page's answer is
	 *    kept: nothing in hand can contradict it.
	 *
	 * @param {?Object} server `config.host`.
	 * @return {?Object} `{members, total}` or null.
	 */
	function confirmedHost( server ) {
		const roster = catalogue.staff || [];
		if ( ! server || ! roster.length ) {
			return server;
		}
		if ( config.staffId ) {
			const pinned = roster.find( ( m ) => m.id === config.staffId );
			return pinned ? { members: [ pinned ], total: 1 } : null;
		}
		const svc = service || lockedService;
		const members = svc
			? eligibleStaffFor( svc, effectiveLocationId )
					.map( ( id ) => roster.find( ( m ) => m.id === id ) )
					.filter( Boolean )
			: [];
		if ( ! members.length ) {
			return null;
		}
		return {
			members: members.slice( 0, 3 ),
			total: members.length,
			others: server.others,
		};
	}

	// QA D01: a one-page block whose pinned service is gone books nothing else instead.
	if ( 'one-page' === config.layout && presetMissing ) {
		return (
			<div class="ap-wrap" ref={ wrapRef }>
				<div class="ap">
					<div class="ap-body">
						<div class="ap-main narrow">
							<ServiceUnavailable phone={ contactPhone } />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if ( onePage ) {
		const introService = service || lockedService;
		// On the confirmation the SERVER's answer names the staff member and the place (an "Any
		// available" booking is assigned somebody), exactly as the confirmation card would have.
		const done = step === 'confirmation' && !! response;
		const introStaff = done ? confirmStaffName : staffName;
		const introLocation = done ? confirmLocation : summaryLocation;
		const host = introHost( done );
		return (
			<div class="ap-wrap" ref={ wrapRef }>
				<div class="ap">
					<div
						class="ap-body ap-op"
						inert={ staffProfile ? true : undefined }
					>
						{ /* First in DOM order, so it is the inline-START column in both
						     directions and comes first when the frame stacks. */ }
						{ introService ? (
							<IntroPanel
								service={ introService }
								booked={
									!! selectedSlotUtc &&
									( step === 'details' ||
										step === 'payment' ||
										step === 'confirmation' )
								}
								staffName={ introStaff }
								staffTitle={ done ? confirmStaffTitle : staffTitle }
								staffAny={ staffAny && ! introStaff }
								staffTerm={ staffTerm }
								contactPhone={ contactPhone }
								contactText={ config.contactText }
								locationName={
									introLocation ? introLocation.name : ''
								}
								locationAddress={
									introLocation ? introLocation.address : ''
								}
								locale={ config.locale }
								currencyExponent={ currencyExponent }
								displayTz={ displayTz }
								businessTz={ businessTz }
								slotUtc={ selectedSlotUtc }
								priceRows={ coupon.renderSummaryRows }
								totalMinor={ coupon.totalMinor }
								totalNote={ totalNote }
								paymentTerms={ step === 'confirmation' ? null : paymentTerms }
								host={ host }
								meetingType={ config.meetingType }
								meetingText={ config.meetingText }
								onChangeTime={
									step === 'details' ||
									( step === 'payment' && ! resume && ! gatewayBusy )
										? changeTime
										: null
								}
							/>
						) : (
							<IntroSkeleton />
						) }
						<div class="ap-main">
							{ step === 'service' && catalogue.loading ? (
								<DateTimeSkeleton />
							) : (
								renderStep()
							) }
						</div>
					</div>
					{ staffProfile && (
						<StaffProfileDialog
							member={ staffProfile.member }
							photos={ staffDisplay.photos }
							titles={ staffDisplay.titles }
							onClose={ () => setStaffProfile( null ) }
							onBook={ ( id ) => selectStaff( id ) }
						/>
					) }
				</div>
				{ toast && <Toast title={ toast.title } body={ toast.body } /> }
			</div>
		);
	}

	return (
		<div class="ap-wrap" ref={ wrapRef }>
			<div class="ap">
				{ showRecap && (
					<div
						class={ 'ap-recap' + ( showAside ? '' : ' solo' ) }
						// `inert` is the modern half of "the background is not
						// operable while the dialog is open" (D-R52): it removes
						// the subtree from the tab order AND from the a11y tree
						// in every engine that has it. The dialog's own focus
						// trap is the fallback for the ones that do not.
						inert={ staffProfile ? true : undefined }
					>
						<button
							type="button"
							class="ap-recap-bar"
							aria-expanded={ recapOpen ? 'true' : 'false' }
							aria-controls={ RECAP_PANEL_ID }
							onClick={ () => setRecapOpen( ( o ) => ! o ) }
						>
							<RecapLine
								service={ service }
								slotUtc={ selectedSlotUtc }
								displayTz={ displayTz }
								locale={ config.locale }
							/>
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
									staffName={ staffName }
									staffTitle={ staffTitle }
									staffAny={ staffAny }
									staffTerm={ staffTerm }
									contactPhone={ contactPhone }
									contactText={ config.contactText }
									locationName={
										summaryLocation ? summaryLocation.name : ''
									}
									locationAddress={
										summaryLocation
											? summaryLocation.address
											: ''
									}
									locale={ config.locale }
									currencyExponent={ currencyExponent }
									displayTz={ displayTz }
									businessTz={ businessTz }
									slotUtc={ selectedSlotUtc }
									priceRows={ coupon.renderSummaryRows }
									totalMinor={ reservedOrder?.total_minor ?? coupon.totalMinor }
									totalNote={ totalNote }
								paymentTerms={ paymentTerms }
								/>
							</div>
						</div>
					</div>
				) }

				<div
					class={ 'ap-body' + ( showAside ? ' has-summary' : '' ) }
					inert={ staffProfile ? true : undefined }
				>
					<div class={ mainClass }>
						{ checkout.open &&
							step !== 'confirmation' &&
							! resumeError &&
							! returnLeg &&
							! resumeToken && (
								<CheckoutNotice
									session={ checkout.session }
									displayTz={ displayTz }
									locale={ config.locale }
									onContinue={ checkout.dismiss }
								/>
							) }
						{ renderStep() }
					</div>
					{ showAside && (
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
								staffName={ staffName }
								staffTitle={ staffTitle }
								staffAny={ staffAny }
								staffTerm={ staffTerm }
								contactPhone={ contactPhone }
								contactText={ config.contactText }
								locationName={
									summaryLocation ? summaryLocation.name : ''
								}
								locationAddress={
									summaryLocation ? summaryLocation.address : ''
								}
								locale={ config.locale }
								currencyExponent={ currencyExponent }
								displayTz={ displayTz }
								businessTz={ businessTz }
								slotUtc={ selectedSlotUtc }
								priceRows={ coupon.renderSummaryRows }
									totalMinor={ reservedOrder?.total_minor ?? coupon.totalMinor }
								totalNote={ totalNote }
								paymentTerms={ paymentTerms }
							/>
						</aside>
					) }
				</div>
				{ /* Inside `.ap` and OUTSIDE `.ap-body`, so it covers the card,
				     summary sidebar included (D-R52). */ }
				{ staffProfile && (
					<StaffProfileDialog
						member={ staffProfile.member }
						photos={ staffDisplay.photos }
						titles={ staffDisplay.titles }
						onClose={ () => setStaffProfile( null ) }
						onBook={ ( id ) => selectStaff( id ) }
					/>
				) }
			</div>
			{ toast && <Toast title={ toast.title } body={ toast.body } /> }
		</div>
	);
}

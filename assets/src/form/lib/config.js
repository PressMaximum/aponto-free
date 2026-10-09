/**
 * Runtime configuration resolution.
 *
 * The widget needs two kinds of config:
 *  - GLOBAL, shared by every instance on the page: the REST base URL, an optional
 *    nonce, the business timezone (drives the D1 init rule) and the business name.
 *    This is injected once as `window.apontoForm` (by the dev harness in B1, and
 *    by the block's PHP enqueue in B2).
 *  - PER-INSTANCE, from the host element's `data-props`: `serviceId`, `staffId`,
 *    `locationId` (D-R62), `layout`, `summaryMode` (D-R49), `staffLayout` (D-R52), `stepDisplay`
 *    (D-R53) and the `appearance` block attributes (accent/radius — Q11,
 *    maxWidth — D-R49).
 *
 * The page-global also carries the Staff-step display block since D-R52
 * (`staff`), which is the one place a per-block prop OVERRIDES a site
 * setting — see {@link resolveConfig}.
 *
 * Pure-ish module: reads `window` but no DOM mutation. The global read is
 * injected for testability.
 */
import { displayName, normalizePart } from '../../shared/person-name.js';

const PHONE_MODES = [ 'off', 'optional', 'required' ];

/** Which clock the booking form opens on (`booking.timezone_mode`, D-R48). */
const TIMEZONE_MODES = [ 'visitor', 'business' ];

/**
 * Where the booking summary lives (block attribute `summaryMode`, D-R49):
 * `always` — sidebar from the first step (default); `step2` — sidebar from the
 * second step (the pre-D-R49 behaviour); `off` — no sidebar, recap bar only.
 */
export const SUMMARY_MODES = [ 'always', 'step2', 'off' ];

/**
 * How the form shows progress (block attribute `stepDisplay`, D-R53): `fraction` — the compact
 * `01 / 05` beside the heading — or `horizontal`, the v4 mockup's macro progress bar above it,
 * which is the DEFAULT since the founder review of 2026-09-30.
 */
export const STEP_DISPLAYS = [ 'fraction', 'horizontal' ];

/**
 * How the form is presented (block attribute `layout`, D-R80): `default` — the step-by-step
 * wizard — or `one-page`, the intro panel beside the active screen for a block pinned to one
 * service. The value only ASKS for the frame; `App` grants it when the service is locked.
 */
export const LAYOUTS = [ 'default', 'one-page' ];

/**
 * How the appointment takes place — the one-page intro's meeting-method line (block attribute
 * `meetingType`, D-R82). `''` means no line.
 */
export const MEETING_TYPES = [ 'in_person', 'phone', 'online', 'custom' ];

/** Longest meeting-method detail line (block `meetingText`, D-R82) — the server's own cap. */
const MAX_MEETING_TEXT = 140;

/**
 * Whether Date & time opens with the first available day already selected (block attribute
 * `preselectDate`, D-R84). An explicit boolean wins; unset follows the flow — ON for the
 * step-by-step form (the B1 behaviour it has always had), OFF for `one-page`, which opens on the
 * calendar alone. ONE rule for the widget, its hand-built configs and the inspector.
 *
 * @param {*}      value  The block attribute (boolean, or anything else for unset).
 * @param {string} layout The block layout.
 * @return {boolean} Preselect.
 */
export function preselectDateFor( value, layout ) {
	return 'boolean' === typeof value ? value : 'one-page' !== layout;
}

/**
 * Whether the one-page intro shows WHO the visitor will meet (block attribute `showHost`,
 * D-R85). An explicit boolean wins; unset is ON for `one-page`. The step-by-step flow has no
 * intro panel, so the answer there is always false. ONE rule for the widget and the inspector.
 *
 * @param {*}      value  The block attribute (boolean, or anything else for unset).
 * @param {string} layout The block layout.
 * @return {boolean} Show the host line.
 */
export function showHostFor( value, layout ) {
	if ( 'one-page' !== layout ) {
		return false;
	}
	return 'boolean' === typeof value ? value : true;
}

/** Staff-step layouts (`booking.staff_layout`, block `staffLayout` — D-R52). */
export const STAFF_LAYOUTS = [ 'list', 'cards' ];

/** Staff-selection modes (`booking.staff_choice`; `required` added by D-R52). */
const STAFF_CHOICE_MODES = [ 'visitor', 'required', 'any' ];

/** `booking.staff_label` ceiling — the server's own cap, restated as the second gate. */
const MAX_STAFF_LABEL = 40;

/**
 * What the widget assumes about the Staff step when the page says nothing (D-R52).
 *
 * `BlockRegistrar::config()` omits the `staff` block entirely without Premium `multi_staff` —
 * the step cannot exist there — so ABSENT is the normal case on most of the installed base and
 * must resolve to the shipped product default without any caller branching on undefined. These
 * six values ARE that default, and they are the same six the PHP schema defaults to, so a site
 * that never opens the panel behaves identically whichever side answers.
 *
 * `label: ''` means "use the translated default term" (`COPY.staff_term`) rather than an empty
 * word: Aponto serves salons, clinics, gyms and tutors, so no noun is hard-coded in the product
 * and the operator's own noun wins when they supply one (founder 2026-09-20).
 */
export const STAFF_DEFAULTS = Object.freeze( {
	layout: 'list',
	photos: true,
	titles: true,
	profiles: false,
	choice: 'visitor',
	label: '',
} );

/**
 * Normalize the page-global `staff` block (D-R52).
 *
 * Presentation state, deliberately NOT part of the REST payload: the widget needs it before it
 * has a roster, and putting display settings into `/public/services` would make a cacheable
 * catalogue response carry them. Re-validated here for the same reason `fields.custom` and
 * `payments` are — the page-global is page data, and an unknown layout must never reach a
 * class name.
 *
 * The three DISCLOSURE flags (`photos`, `titles`, `profiles`) are layout hints only. The server
 * does not publish the field a switch turned off, so a tampered page-global can reveal nothing:
 * with `photos: true` forced on a site that turned photos off, every entry simply has no
 * `avatar` to draw.
 *
 * `label` is operator-authored text. It is capped, trimmed and then rendered as a TEXT NODE
 * through `sprintf` — never as markup — so a label containing `<b>` shows the angle brackets.
 *
 * @param {*} raw Raw `staff` value.
 * @return {{layout:string, photos:boolean, titles:boolean, profiles:boolean, choice:string, label:string}} Block.
 */
export function normalizeStaffConfig( raw ) {
	const s = raw && typeof raw === 'object' ? raw : {};
	const bool = ( value, fallback ) =>
		typeof value === 'boolean' ? value : fallback;

	return {
		layout: STAFF_LAYOUTS.includes( s.layout )
			? s.layout
			: STAFF_DEFAULTS.layout,
		photos: bool( s.photos, STAFF_DEFAULTS.photos ),
		titles: bool( s.titles, STAFF_DEFAULTS.titles ),
		profiles: bool( s.profiles, STAFF_DEFAULTS.profiles ),
		choice: STAFF_CHOICE_MODES.includes( s.choice )
			? s.choice
			: STAFF_DEFAULTS.choice,
		label: cappedText( s.label, MAX_STAFF_LABEL ),
	};
}

/** Field types the widget can draw with the stylesheet it already ships. */
const CUSTOM_TYPES = [ 'text', 'textarea', 'select', 'checkbox' ];

/** Hard cap on custom fields, mirroring `CustomFieldSchema::MAX_FIELDS`. */
const MAX_CUSTOM = 8;

const SLUG_RE = /^[a-z0-9_]{1,32}$/;

/**
 * Normalize one contributed custom-field definition, or null when unusable.
 *
 * The server validates the same shape before printing it, so this is the second
 * of two gates rather than the only one — but the page-global is page data, and
 * the renderer must never be handed a type it has no control for.
 *
 * @param {*} raw Raw definition.
 * @return {?Object} Definition or null.
 */
function normalizeCustomField( raw ) {
	if ( ! raw || typeof raw !== 'object' ) {
		return null;
	}
	const slug = typeof raw.slug === 'string' ? raw.slug : '';
	const label = typeof raw.label === 'string' ? raw.label : '';
	const type = typeof raw.type === 'string' ? raw.type : '';
	if ( ! SLUG_RE.test( slug ) || ! label || ! CUSTOM_TYPES.includes( type ) ) {
		return null;
	}

	let options = [];
	if ( type === 'select' ) {
		options = ( Array.isArray( raw.options ) ? raw.options : [] )
			.filter(
				( o ) =>
					o &&
					typeof o === 'object' &&
					typeof o.value === 'string' &&
					o.value !== '' &&
					typeof o.label === 'string' &&
					o.label !== ''
			)
			.map( ( o ) => ( { value: o.value, label: o.label } ) );
		if ( ! options.length ) {
			return null;
		}
	}

	const max = parseInt( raw.max_length, 10 );
	return {
		slug,
		label,
		type,
		required: !! raw.required,
		options,
		maxLength: Number.isInteger( max ) && max > 0 ? max : 0,
	};
}

/**
 * Normalize the site's custom booking-form fields (D-R30).
 *
 * @param {*} raw Raw `fields.custom` value.
 * @return {Array<Object>} Usable definitions (possibly empty).
 */
export function normalizeCustomFields( raw ) {
	if ( ! Array.isArray( raw ) ) {
		return [];
	}
	const out = [];
	const seen = new Set();
	for ( const entry of raw ) {
		if ( out.length >= MAX_CUSTOM ) {
			break;
		}
		const field = normalizeCustomField( entry );
		if ( field && ! seen.has( field.slug ) ) {
			seen.add( field.slug );
			out.push( field );
		}
	}
	return out;
}

/**
 * Normalize the `/public/services` staff roster (D-R50).
 *
 * Both keys are OMITTED by the server unless the feature is live (Premium `multi_staff` ∧
 * `booking.staff_choice` ∈ {`visitor`, `required`} ∧ ≥2 eligible active staff), so ABSENT is the
 * normal case
 * and must resolve to "no roster" without the callers branching on undefined. Everything here
 * is the second of two gates, same as `fields.custom`: the server validated it, and the
 * renderer must still never be handed an id it cannot name.
 *
 * D-R51 adds the optional PUBLIC PROFILE keys — `title` and `avatar` — which the server OMITS
 * when the operator left them empty. They are normalized defensively and independently: a
 * malformed one is dropped, never allowed to disqualify the row, because the id and the name
 * are the only things the step actually needs to work.
 *
 * `bio` is parsed the same way, and since D-R52 the server does send it — but ONLY behind the
 * site-wide "Let customers view staff profiles" opt-in, which defaults OFF, and only for a
 * staff member who actually filled one. A roster entry with no `bio` therefore gets no profile
 * trigger, which is exactly how switching the opt-in on avoids putting an empty "Learn more"
 * under a colleague who left the field blank.
 *
 * Name split (2026-10-01): an entry also carries `first_name` / `last_name` (under the same
 * D-R52 gates as `name`, so either may be absent). `name` stays the server-composed display
 * name; when a payload has only the parts, it is composed here with the shared rule.
 *
 * @param {*} raw Raw top-level `staff` value.
 * @return {Array<{id:number, name:string, first_name:string, last_name:string, title:string, bio:string, avatar:?{url:string, url2x:string}}>} Roster (possibly empty).
 */
export function normalizeStaffRoster( raw ) {
	if ( ! Array.isArray( raw ) ) {
		return [];
	}
	const out = [];
	const seen = new Set();
	// NO length cap, deliberately (fix round 1): the server already decided who is eligible, and
	// silently dropping the tail would hide staff the contract says are bookable — on the
	// exact site that needs this feature most. Shape and type validation only.
	for ( const entry of raw ) {
		if ( ! entry || typeof entry !== 'object' ) {
			continue;
		}
		const id = toId( entry.id );
		const firstName = typeof entry.first_name === 'string' ? normalizePart( entry.first_name ) : '';
		const lastName = typeof entry.last_name === 'string' ? normalizePart( entry.last_name ) : '';
		const name =
			typeof entry.name === 'string' && entry.name !== ''
				? entry.name
				: displayName( firstName, lastName );
		// A nameless staff member is not pickable: the whole surface is "name only", so a row
		// with nothing to read would be an anonymous button that changes the booking.
		if ( id === null || name === '' || seen.has( id ) ) {
			continue;
		}
		seen.add( id );
		out.push( {
			id,
			name,
			first_name: firstName,
			last_name: lastName,
			title: cappedText( entry.title, MAX_STAFF_TITLE ),
			bio: cappedText( entry.bio, MAX_STAFF_BIO ),
			avatar: normalizeStaffAvatar( entry.avatar ),
		} );
	}
	return out;
}

/**
 * Normalize the server-resolved host / team payload of a one-page block (D-R85,
 * `BlockRegistrar` → `Frontend\HostLine`): `{members, total, others}`, or null.
 *
 * The SECOND gate, like every roster normalizer here: the server already decided who is public
 * and eligible, and this only refuses a malformed shape. Members carry no id — none is needed and
 * a Free site publishes none. A nameless member is dropped (an anonymous face says nothing),
 * `title` and `avatar` are the roster's own normalizers (the avatar URL test included), at most
 * three members are kept, and `total` can never be below the members actually present.
 *
 * @param {*} raw The `host` prop.
 * @return {?{members:Array<{name:string, first_name:string, last_name:string, title:string, avatar:?{url:string, url2x:string}}>, total:number, others:boolean}} Host.
 */
export function normalizeHost( raw ) {
	if ( ! raw || typeof raw !== 'object' || ! Array.isArray( raw.members ) ) {
		return null;
	}
	const members = [];
	for ( const entry of raw.members ) {
		if ( ! entry || typeof entry !== 'object' || members.length >= 3 ) {
			continue;
		}
		const firstName =
			typeof entry.first_name === 'string'
				? normalizePart( entry.first_name )
				: '';
		const lastName =
			typeof entry.last_name === 'string'
				? normalizePart( entry.last_name )
				: '';
		const name =
			typeof entry.name === 'string' && entry.name.trim() !== ''
				? entry.name.trim()
				: displayName( firstName, lastName );
		if ( name === '' ) {
			continue;
		}
		members.push( {
			name,
			first_name: firstName,
			last_name: lastName,
			title: cappedText( entry.title, MAX_STAFF_TITLE ),
			avatar: normalizeStaffAvatar( entry.avatar ),
		} );
	}
	if ( ! members.length ) {
		return null;
	}
	const total = parseInt( raw.total, 10 );
	return {
		members,
		total:
			Number.isInteger( total ) && total > members.length
				? total
				: members.length,
		// Hidden colleagues the any-staff path may assign (D-R85 fix round 2): a flag, never a
		// count — the sentence ends "or another team member" and no number moves for them.
		others: true === raw.others,
	};
}

/**
 * Normalize the `/public/services` LOCATION roster (D-R62, contract §3.1 addendum 2026-09-23).
 *
 * Mirrors {@link normalizeStaffRoster} rule for rule, because it is the same kind of payload
 * behind the same kind of gate (Premium `multi_location` ∧ `booking.location_choice = visitor` ∧
 * ≥2 active locations serving ≥1 service): ABSENT is the normal Free and single-location answer
 * and resolves to `[]` without any caller branching on undefined; NO length cap (the server
 * decided what is bookable); a nameless entry is dropped, because a row with nothing to read
 * would be an anonymous button that changes the booking. `address` is the server's one-line
 * display string and may legitimately be `''` — the row then has one line, not an empty second.
 *
 * Text only: `name` and `address` are rendered as text nodes; `phone` (when present) reaches a
 * `tel:` href only through {@link telHref}.
 *
 * @param {*} raw Raw top-level `locations` value.
 * @return {Array<{id:number, name:string, address:string}>} Roster (possibly empty).
 */
export function normalizeLocationRoster( raw ) {
	if ( ! Array.isArray( raw ) ) {
		return [];
	}
	const out = [];
	const seen = new Set();
	for ( const entry of raw ) {
		if ( ! entry || typeof entry !== 'object' ) {
			continue;
		}
		const id = toId( entry.id );
		const name = typeof entry.name === 'string' ? entry.name.trim() : '';
		if ( id === null || name === '' || seen.has( id ) ) {
			continue;
		}
		seen.add( id );
		const row = {
			id,
			name,
			address:
				typeof entry.address === 'string' ? entry.address.trim() : '',
		};
		// The branch's public phone for the contact-help line — only when set, so a roster
		// from a server that sends none reads exactly as before. It reaches a `tel:` href only
		// through {@link telHref}, which keeps nothing but digits and a leading `+`.
		const phone = typeof entry.phone === 'string' ? entry.phone.trim() : '';
		if ( phone ) {
			row.phone = phone;
		}
		out.push( row );
	}
	return out;
}

/**
 * A `tel:` URL for a displayed phone number: digits only, plus one leading `+`. `''` when
 * fewer than 3 digits survive — the contact line then prints nothing (T-088).
 *
 * @param {string} phone Display phone.
 * @return {string} `tel:` URL or ''.
 */
export function telHref( phone ) {
	const raw = String( phone || '' ).trim();
	const digits = raw.replace( /\D+/g, '' );
	if ( digits.length < 3 ) {
		return '';
	}
	return 'tel:' + ( raw.startsWith( '+' ) ? '+' : '' ) + digits;
}

/**
 * Whether a typed phone number can be one (persona QA 2026-10-05, T-088) — the LOOSE rule the
 * server applies to `customer.phone` (`PublicBookingsController::phoneLooksValid()`): digits,
 * spaces and `+ ( ) - .` only, and at least five digits. Loose on purpose: no country format is
 * assumed, it only stops "abc" being stored as somebody's phone.
 *
 * @param {string} phone Typed phone.
 * @return {boolean} True when it reads as a phone number.
 */
export function isPhoneLike( phone ) {
	const raw = String( phone || '' ).trim();
	return (
		/^[0-9+().\- ]+$/.test( raw ) && raw.replace( /\D+/g, '' ).length >= 5
	);
}

/**
 * One service's eligible location ids, against the location roster (D-R62).
 *
 * Same rule as {@link normalizeStaffIds}: an id the roster does not name is DROPPED, since the
 * step can only render a name, and with no roster the answer is `[]` whatever the item says.
 *
 * @param {*}                              item   Raw service item (reads `location_ids`).
 * @param {Array<{id:number,name:string}>} roster Normalized location roster.
 * @return {number[]} Eligible location ids, in payload order.
 */
export function normalizeServiceLocationIds( item, roster ) {
	const raw = item && typeof item === 'object' ? item.location_ids : null;
	return normalizeStaffIds( raw, roster );
}

/**
 * One service's staff, PER LOCATION (D-R62): `{ <location id>: [staff ids] }`.
 *
 * Narrowing is per (service, location) pair, never per staff member — a stylist who does Cuts
 * Downtown and Color Uptown must not be offered for a Cut Uptown (rest-contract §3.1 addendum
 * 2026-09-23, "sửa lần 2"). The server sends `location_staff_ids` only while the location roster
 * is published, with a key for every location in the item's `location_ids`.
 *
 * Tolerant like every other roster key: absent or not an object ⇒ `{}` ("no per-location
 * answer", which callers read as "no narrowing" — see `eligibleStaffFor()`); a key that is not a
 * location the item is offered at is dropped; a list is cleaned exactly like `staff_ids`, so an
 * id the staff roster does not name never reaches a row.
 *
 * `staffRoster = null` returns the RAW numeric map instead (fix round 2): positive, de-duplicated
 * ids with no roster check, because the server publishes this map with the LOCATION roster even
 * when there is no `staff[]` to check against, and a block-preset staff id is looked up in it.
 *
 * @param {*}                               item        Raw service item.
 * @param {number[]}                        locationIds The item's normalized `location_ids`.
 * @param {?Array<{id:number,name:string}>} staffRoster Normalized staff roster, or null for raw.
 * @return {Object<string, number[]>} Staff ids per location id (possibly empty).
 */
export function normalizeLocationStaffIds( item, locationIds, staffRoster ) {
	const raw = item && typeof item === 'object' ? item.location_staff_ids : null;
	const out = {};
	if ( ! raw || typeof raw !== 'object' || Array.isArray( raw ) ) {
		return out;
	}
	( locationIds || [] ).forEach( ( id ) => {
		const list = raw[ String( id ) ];
		if ( ! Array.isArray( list ) ) {
			return;
		}
		out[ id ] =
			null === staffRoster
				? list
						.map( toId )
						.filter(
							( v, i, all ) => v !== null && all.indexOf( v ) === i
						)
				: normalizeStaffIds( list, staffRoster );
	} );
	return out;
}

/** `title` ceiling — the server's `varchar(191)` column width (D-R51). */
const MAX_STAFF_TITLE = 191;

/** `bio` ceiling — the server's product limit, restated here as the second gate (D-R51). */
const MAX_STAFF_BIO = 600;

/**
 * A trimmed, length-capped string, or `''` for anything that is not usable text.
 *
 * TRUNCATES rather than drops, unlike the server, and the asymmetry is deliberate: the server
 * refuses an over-long value so the operator can fix it, while the widget is the last stop
 * before a paint and has nobody to tell. A capped string still renders; a dropped one loses
 * information the operator meant to publish.
 *
 * @param {*}      value Raw value.
 * @param {number} max   Maximum length.
 * @return {string} Usable text.
 */
function cappedText( value, max ) {
	if ( typeof value !== 'string' ) {
		return '';
	}
	const trimmed = value.trim();
	// COUNT CODE POINTS, not UTF-16 code units (fix round 1, P3-1). The server counts characters
	// (`mb_strlen`/`mb_substr`), so `slice()` disagreed with it on any astral character — a
	// 40-emoji term became 20 — and, worse, could cut a surrogate pair in half and emit a lone
	// surrogate. The spread form is the cheap, correct one; the fast path keeps it free for the
	// BMP-only strings that are almost every value.
	if ( trimmed.length <= max ) {
		return trimmed;
	}
	return [ ...trimmed ].slice( 0, max ).join( '' );
}

/**
 * Normalize one roster entry's `avatar` (D-R51).
 *
 * The URL test is the point of this function. A booking form renders it into `src`/`srcset`
 * of an `<img>`, so the accepted set is narrow ON PURPOSE: absolute `http(s)`, or a relative
 * path that resolves against the page's own origin. Everything else — `javascript:`, `data:`,
 * protocol-relative `//evil.example`, anything that fails to parse — is dropped and the row
 * falls back to initials. The payload is same-origin REST, so this can only ever fire on a
 * compromised or misconfigured server; it costs nothing and closes the one place a string from
 * the wire reaches a URL-bearing attribute.
 *
 * `url_2x` is optional on the wire only in the sense that it always equals `url` when the
 * library never generated the larger size; a missing or rejected one degrades to `url`, which
 * keeps `srcset` honest rather than pointing at nothing. Each URL is canonicalised
 * INDEPENDENTLY — never derived from the other — so one bad value can only ever be replaced by
 * a good one, not blended with it.
 *
 * @param {*} raw Raw `avatar` value.
 * @return {?{url:string, url2x:string}} Usable avatar, or null.
 */
function normalizeStaffAvatar( raw ) {
	if ( ! raw || typeof raw !== 'object' ) {
		return null;
	}
	const url = safeImageUrl( raw.url );
	if ( ! url ) {
		return null;
	}
	return { url, url2x: safeImageUrl( raw.url_2x ) || url };
}

/**
 * A URL safe to put in an `<img src>` **and in a `srcset` candidate list**: `http(s)`, or
 * same-origin after resolution, carrying no ASCII whitespace and no comma.
 *
 * **The whitespace/comma rejection is the srcset rule, and it is why this returns the CANONICAL
 * `parsed.href` rather than the caller's string.** `srcset` is a comma-separated list whose
 * candidates are `<url> <descriptor>`, so a single value containing `", "` is not one candidate
 * that happens to look odd — it is TWO candidates, and the browser may pick the second. A
 * roster URL reading `https://safe.example/a.jpg, https://tracker.example/x.jpg` would silently
 * add a third-party image request to every booking form. Returning the parsed `href` also means
 * what we validated is exactly what we emit: no leading `\t`, no stray space, no second reading
 * of the same string.
 *
 * @param {*} value Raw URL.
 * @return {string} The canonical URL, or '' when it is not usable.
 */
function safeImageUrl( value ) {
	if ( typeof value !== 'string' || value === '' ) {
		return '';
	}
	const raw = value.trim();
	// A protocol-relative URL resolves to the page's scheme but somebody ELSE's host, so it is
	// neither an absolute http(s) URL we verified nor a same-origin relative path.
	if ( raw === '' || raw.startsWith( '//' ) ) {
		return '';
	}
	// ASCII whitespace (the HTML spec's set) or a comma anywhere: reject rather than escape.
	// A legitimate media URL has neither — WordPress percent-encodes both — so there is nothing
	// to lose, and "reject" cannot be got wrong the way "escape" can.
	if ( /[\t\n\f\r ,]/.test( raw ) ) {
		return '';
	}
	const base =
		typeof window !== 'undefined' && window.location
			? window.location.href
			: undefined;
	let parsed;
	try {
		parsed = new URL( raw, base );
	} catch ( e ) {
		return '';
	}
	if ( parsed.protocol !== 'http:' && parsed.protocol !== 'https:' ) {
		return '';
	}
	// Re-check the CANONICAL form: `new URL()` percent-encodes some inputs but not all, and the
	// string that reaches the attribute is this one.
	if ( /[\t\n\f\r ,]/.test( parsed.href ) ) {
		return '';
	}
	return parsed.href;
}

/**
 * Normalize one service's eligible-staff ids against the roster (D-R50).
 *
 * An id the roster does not name is DROPPED rather than kept as a bare number: the step can
 * only render a name, so an unnameable id would either be invisible (and silently narrow the
 * customer's choice) or render blank. Dropping it degrades to "fewer staff offered",
 * which the any-staff assignment still covers.
 *
 * @param {*}                              raw    Raw `staff_ids` value.
 * @param {Array<{id:number,name:string}>} roster Normalized roster.
 * @return {number[]} Eligible ids, in payload order.
 */
export function normalizeStaffIds( raw, roster ) {
	if ( ! Array.isArray( raw ) || ! roster.length ) {
		return [];
	}
	const known = new Set( roster.map( ( s ) => s.id ) );
	const out = [];
	const seen = new Set();
	for ( const value of raw ) {
		const id = toId( value );
		if ( id === null || seen.has( id ) || ! known.has( id ) ) {
			continue;
		}
		seen.add( id );
		out.push( id );
	}
	return out;
}

/** Payment modes the widget knows how to render (rest-contract §3.3). */
const PAYMENT_MODES = [ 'off', 'optional', 'required' ];

/** Hard cap on offered gateways — the server offers a handful, never a list. */
const MAX_GATEWAYS = 6;

/**
 * Normalize the page-global `payments` block (D-R38).
 *
 * The shape mirrors what `BlockRegistrar::payments()` prints: the mode, the hold
 * length the widget quotes back to the visitor, and the OFFERED gateways with
 * only the public client config their own driver published. Everything is
 * re-validated here for the same reason `fields.custom` is: the page-global is
 * page data, and the renderer must never be handed a gateway it cannot draw.
 *
 * `client` is deliberately passed through as opaque strings — core knows nothing
 * about what a publishable key is, and neither does this normalizer.
 *
 * @param {*} raw Raw `payments` value.
 * @return {{mode:string, holdMinutes:number, gateways:Array<Object>}} Normalized block.
 */
export function normalizePayments( raw ) {
	const p = raw && typeof raw === 'object' ? raw : {};
	const hold = parseInt( p.hold_minutes, 10 );
	const gateways = [];
	const seen = new Set();

	( Array.isArray( p.gateways ) ? p.gateways : [] ).forEach( ( entry ) => {
		if (
			gateways.length >= MAX_GATEWAYS ||
			! entry ||
			typeof entry !== 'object'
		) {
			return;
		}
		const code = typeof entry.code === 'string' ? entry.code : '';
		if ( ! /^[a-z0-9_]{1,64}$/.test( code ) || seen.has( code ) ) {
			return;
		}
		const client = {};
		const rawClient =
			entry.client && typeof entry.client === 'object'
				? entry.client
				: {};
		Object.keys( rawClient ).forEach( ( key ) => {
			const value = rawClient[ key ];
			if ( typeof value === 'string' || typeof value === 'number' ) {
				client[ key ] = String( value );
			}
		} );
		seen.add( code );
		gateways.push( {
			code,
			label: typeof entry.label === 'string' ? entry.label : '',
			client,
		} );
	} );

	// A mode with nothing to pay with is `off` — the same collapse the server
	// applies (D-R38a(1)), restated here so a malformed payload cannot produce a
	// Payment step with no methods on it.
	const mode = PAYMENT_MODES.includes( p.mode ) ? p.mode : 'off';

	// The site currency's ISO exponent, as the SERVER computed it. `null` when the
	// payload predates it, which every consumer treats as "fall back to Intl".
	const exponent = parseInt( p.currency_exponent, 10 );

	return {
		mode: gateways.length ? mode : 'off',
		holdMinutes: Number.isInteger( hold ) && hold > 0 ? hold : 30,
		currencyExponent:
			Number.isInteger( exponent ) && exponent >= 0 && exponent <= 4
				? exponent
				: null,
		gateways,
		// D-R79: a PAID service cannot be booked online right now (server-decided, opt-in).
		paidUnavailable: true === p.paid_unavailable,
	};
}

/**
 * Read the page-global config object defensively.
 * @param {Window} [win] Window (injected for testability).
 */
export function readGlobalConfig( win ) {
	const w = win || ( typeof window !== 'undefined' ? window : {} );
	const g =
		w.apontoForm && typeof w.apontoForm === 'object' ? w.apontoForm : {};
	const business =
		g.business && typeof g.business === 'object' ? g.business : {};
	const fields = g.fields && typeof g.fields === 'object' ? g.fields : {};
	const consent =
		fields.consent && typeof fields.consent === 'object'
			? fields.consent
			: {};
	return {
		restUrl: String( g.restUrl || '' ),
		nonce: g.nonce ? String( g.nonce ) : '',
		locale: g.locale ? String( g.locale ) : 'en-US',
		// The site's WordPress time format (a PHP `date()` pattern), read by `tz.js` for the
		// 12 h / 24 h choice only (T-071). '' — an older page — leaves the locale to decide.
		timeFormat:
			typeof business.time_format === 'string' ? business.time_format : '',
		business: {
			timezone: business.timezone ? String( business.timezone ) : 'UTC',
			// `booking.timezone_mode` (D-R48). Narrowed here, not in `tz.js`, for the
			// same reason every other key on this object is: whatever the page hands
			// the widget is untrusted input. An unknown value reads as `visitor`,
			// which is the pre-D-R48 behaviour.
			timezone_mode:
				TIMEZONE_MODES.includes( business.timezone_mode )
					? business.timezone_mode
					: 'visitor',
			name: business.name ? String( business.name ) : '',
			// Public business phone for the summary's contact-help line; '' = print nothing.
			phone: business.phone ? String( business.phone ).trim() : '',
		},
		fields: {
			phone: PHONE_MODES.includes( fields.phone )
				? fields.phone
				: 'optional',
			consent: {
				enabled: !! consent.enabled,
				text: consent.text ? String( consent.text ) : '',
			},
			// Unknown keys are dropped by this normalizer by design, so a new
			// payload key must be whitelisted here to exist at all (D-R30).
			custom: normalizeCustomFields( fields.custom ),
		},
		// Always present, always safe to read: a site that takes no online payment
		// resolves to `{mode:'off', gateways:[]}` and every payment branch below is
		// dead code at runtime (D-R38).
		payments: normalizePayments( g.payments ),
		coupons: {
			enabled: !! ( g.coupons && typeof g.coupons === 'object' && g.coupons.enabled ),
		},
		// Always present, always safe to read: a page with no `staff` block — Free, and every
		// page of a Premium site before this release — resolves to the shipped defaults (D-R52).
		staff: normalizeStaffConfig( g.staff ),
	};
}

/**
 * Parse a host element's `data-props` JSON safely.
 *
 * @param {string} raw The raw attribute value.
 * @return {Object} Parsed props (empty object on failure).
 */
export function parseProps( raw ) {
	if ( ! raw ) {
		return {};
	}
	try {
		const parsed = JSON.parse( raw );
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

/**
 * Normalize a value to a positive integer id or null.
 *
 * @param {*} value Value.
 * @return {?number} Positive int or null.
 */
function toId( value ) {
	const n = parseInt( value, 10 );
	return Number.isInteger( n ) && n > 0 ? n : null;
}

/**
 * Merge global config with per-instance props into a single resolved config.
 *
 * @param {Object} global Global config from {@link readGlobalConfig}.
 * @param {Object} props  Parsed data-props.
 * @return {Object} Resolved config.
 */
export function resolveConfig( global, props ) {
	const p = props || {};
	// The ONE per-block staff override (D-R52): layout. A valid `staffLayout` prop beats the
	// site setting; anything else — absent, empty, unknown — inherits, which is what every block
	// saved before this attribute existed means. Merged into the resolved `staff` object rather
	// than kept beside it, so every consumer reads one place and cannot forget the precedence.
	const staff = global.staff || normalizeStaffConfig( null );
	const blockLayout = STAFF_LAYOUTS.includes( p.staffLayout )
		? p.staffLayout
		: '';

	const layout = LAYOUTS.includes( p.layout ) ? p.layout : 'default';

	return Object.assign( {}, global, {
		staff: blockLayout
			? Object.assign( {}, staff, { layout: blockLayout } )
			: staff,
		serviceId: toId( p.serviceId ),
		staffId: toId( p.staffId ),
		// Block preset location (D-R62): pins the booking to one place and removes the step.
		locationId: toId( p.locationId ),
		// Allow-listed like every other prop (D-R80): anything unknown is the wizard.
		layout,
		preselectDate: preselectDateFor( p.preselectDate, layout ),
		// The one-page host / team line (D-R85): the block's switch, and the people the SERVER
		// resolved for it (absent whenever the switch is off or nobody is publishable).
		showHost: showHostFor( p.showHost, layout ),
		host: showHostFor( p.showHost, layout )
			? normalizeHost( p.host )
			: null,
		// Untrusted like every other prop: anything unknown reads as the default.
		summaryMode: SUMMARY_MODES.includes( p.summaryMode )
			? p.summaryMode
			: 'always',
		stepDisplay: STEP_DISPLAYS.includes( p.stepDisplay )
			? p.stepDisplay
			: 'horizontal',
		// The "Questions? Call …" line (founder review 2026-09-30): on unless the block says
		// `false`; an optional heading override, trimmed and capped like the server does.
		contactHelp: false !== p.contactHelp,
		contactText:
			typeof p.contactText === 'string' ? p.contactText.trim().slice( 0, 80 ) : '',
		// The meeting-method line (D-R82). Allow-listed type; PLAIN text — tags stripped,
		// trimmed and capped like the server does — rendered as a text node, never as markup.
		meetingType: MEETING_TYPES.includes( p.meetingType )
			? p.meetingType
			: '',
		meetingText:
			typeof p.meetingText === 'string'
				? p.meetingText
						.replace( /<[^>]*>/g, '' )
						.trim()
						.slice( 0, MAX_MEETING_TEXT )
				: '',
		appearance:
			p.appearance && typeof p.appearance === 'object'
				? p.appearance
				: {},
	} );
}

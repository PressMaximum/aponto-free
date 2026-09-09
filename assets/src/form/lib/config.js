/**
 * Runtime configuration resolution.
 *
 * The widget needs two kinds of config:
 *  - GLOBAL, shared by every instance on the page: the REST base URL, an optional
 *    nonce, the business timezone (drives the D1 init rule) and the business name.
 *    This is injected once as `window.apontoForm` (by the dev harness in B1, and
 *    by the block's PHP enqueue in B2).
 *  - PER-INSTANCE, from the host element's `data-props`: `serviceId`, `staffId`,
 *    `layout` and the `appearance` block attributes (accent/radius — Q11).
 *
 * Pure-ish module: reads `window` but no DOM mutation. The global read is
 * injected for testability.
 */

const PHONE_MODES = [ 'off', 'optional', 'required' ];

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
		business: {
			timezone: business.timezone ? String( business.timezone ) : 'UTC',
			name: business.name ? String( business.name ) : '',
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
	return Object.assign( {}, global, {
		serviceId: toId( p.serviceId ),
		staffId: toId( p.staffId ),
		layout: p.layout ? String( p.layout ) : 'default',
		appearance:
			p.appearance && typeof p.appearance === 'object'
				? p.appearance
				: {},
	} );
}

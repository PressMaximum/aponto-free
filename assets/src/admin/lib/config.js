/**
 * Boot config accessor. `window.apontoAdmin` is injected by AdminPage::bootConfig
 * (same-origin relative REST base + nonce + business/timezone/currency context +
 * curated settings + capability booleans).
 */
const raw = typeof window !== 'undefined' ? window.apontoAdmin || {} : {};

export const config = {
	restUrl: raw.restUrl || '/wp-json/aponto/v1',
	nonce: raw.nonce || '',
	adminUrl: raw.adminUrl || '',
	pageSlug: raw.pageSlug || 'aponto',
	assetsUrl: raw.assetsUrl || '',
	locale: raw.locale || 'en-US',
	edition: raw.edition || 'free',
	// The site's PLAN edition, as opposed to `edition` above (the dist directory being served).
	// Drives MARKETING CHROME ONLY — upsell links, the free-vs-premium comparison — never what a
	// module can do: availability is `available`/`Plan::has()`, enforced in REST. Anything other
	// than a literal 'premium' normalizes to 'free', so boot data older than this bundle keeps
	// today's upsell behaviour rather than silently hiding it from a Free site.
	planEdition: raw.planEdition === 'premium' ? 'premium' : 'free',
	currency: raw.currency || 'USD',
	// THE CANONICAL minor-unit exponent for `currency`, shipped by PHP (`Settings::currencyExponent`).
	// Read with an INTEGER check rather than `||`, because 0 is a real exponent (JPY, VND, ISK) and
	// `||` would silently promote every zero-decimal store to 2 — the same class of 100× error this
	// field exists to remove. Boot data older than this bundle answers 2, the ISO default.
	currencyExponent: Number.isInteger( raw.currencyExponent ) ? raw.currencyExponent : 2,
	business: {
		timezone: raw.business?.timezone || 'UTC',
		timezoneCity: raw.business?.timezoneCity || '',
		utcOffset: raw.business?.utcOffset || 'GMT',
		name: raw.business?.name || '',
		address: raw.business?.address || '',
		phone: raw.business?.phone || '',
		today: raw.business?.today || new Date().toISOString().slice( 0, 10 ),
	},
	settings: {
		defaultBookingStatus: raw.settings?.defaultBookingStatus || 'pending',
		slotStep: Number( raw.settings?.slotStep ) || 30,
		minLeadMinutes: Number( raw.settings?.minLeadMinutes ) || 0,
		maxHorizonDays: Number( raw.settings?.maxHorizonDays ) || 365,
		weekStartsOn: Number( raw.settings?.weekStartsOn ) || 1,
		dateFormat: raw.settings?.dateFormat || 'F j, Y',
		timeFormat: raw.settings?.timeFormat || 'g:i a',
		phoneField: raw.settings?.phoneField || 'optional',
	},
	caps: {
		bookings: raw.caps?.bookings !== false,
		services: Boolean( raw.caps?.services ),
		staff: Boolean( raw.caps?.staff ),
		settings: Boolean( raw.caps?.settings ),
	},
	// Business-hours weekly rows (staff_id=0 scope) — boot data because no REST
	// route reads the business scope yet (see AdminPage::businessWeekly()).
	businessHours: Array.isArray( raw.businessHours ) ? raw.businessHours : [],
	// Booking page the wizard created (readiness card), or null.
	bookingPage: raw.bookingPage && typeof raw.bookingPage === 'object' ? raw.bookingPage : null,
	wizardUrl: raw.wizardUrl || '',
	// Neutral global currency menu for the Settings currency select (same list as the wizard).
	currencies: Array.isArray( raw.currencies ) ? raw.currencies : [],
	// Settings tab/panel grouping metadata (SPEC-P1 §1.6) — the Settings tabs render
	// from this; values come from GET /settings. Module catalog (SPEC-P0 §3.2) for the
	// read-only Modules surface. WP privacy tool deep-links for the Privacy launcher (§5).
	settingsSchema: Array.isArray( raw.settingsSchema ) ? raw.settingsSchema : [],
	// `available` is the plan truth for THIS build (`Plan::has()`, D-R27) and it is what card
	// state and the `#modules/{code}` route key on. Normalized to a strict boolean here so a
	// bundle newer than the PHP (a half-rebuilt dev tree) degrades to `false` — "not available"
	// is the conservative answer: it keeps the lock and the upsell rather than claiming a
	// capability the site may not own.
	modules: Array.isArray( raw.modules )
		? raw.modules.map( ( mod ) => ( { ...mod, available: mod?.available === true } ) )
		: [],
	privacyTools: raw.privacyTools && typeof raw.privacyTools === 'object' ? raw.privacyTools : {},
	// Integration surface (D-R34/D-R35). `redirectUri` is DERIVED, not a setting — the site owner
	// must paste core's exact value into their own OAuth client. `connections` is the non-secret
	// per-staff projection (status / account / since) that the module panel and the staff editor's
	// read-only line both render; it never carries a token. `notice` is the one-shot result of an
	// OAuth return leg, already cleared server-side when this snapshot was built.
	integration: {
		redirectUri: raw.integration?.redirectUri || '',
		notice: raw.integration?.notice && typeof raw.integration.notice === 'object' ? raw.integration.notice : null,
		connections:
			raw.integration?.connections && typeof raw.integration.connections === 'object'
				? raw.integration.connections
				: {},
	},
};

/** The single "Business time · City (offset)" context line (SPEC-P1 §1.4). */
export const businessTimeLine = `Business time · ${ config.business.timezoneCity } (${ config.business.utcOffset })`;

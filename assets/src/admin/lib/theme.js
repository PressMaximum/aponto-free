/**
 * Admin color-scheme runtime (mockup workspace menu → Appearance group).
 *
 * The mockup owns the contract: three modes in this order — Light · Dark ·
 * System — driving `data-ap-color-scheme` on the token scope, with System read
 * from `matchMedia('(prefers-color-scheme: dark)')` and kept live
 * (docs/mockups/v4/plugin-dashboard/assets/js/plugin-dashboard.js:2128-2176).
 * Dark itself is a token preset, not a second theme: `styles/aponto-tokens.css`
 * re-seeds the `--ap-*` engine under `[data-ap-color-scheme="dark"]` and the
 * kit bridge re-derives every `--pmdk-*` from it.
 *
 * Persistence follows DESIGN-SYSTEM.md §"Persistent workspace preferences":
 * namespaced + versioned `localStorage`, and a storage failure must never block
 * the interaction — it degrades to the current view state, no error surfaced.
 * AdminPage::renderRoot() prints the same key from an inline boot script so the
 * stored scheme is on the element before first paint (no light flash).
 *
 * Pure functions here, React glue in App.jsx: everything below is unit-testable
 * without a DOM (tests/js/theme.test.js).
 */

/** Namespaced + versioned preference key — must match AdminPage::COLOR_SCHEME_KEY. */
export const THEME_STORAGE_KEY = 'aponto.dashboard.color-scheme.v1';

/** Selectable modes, in mockup order (index.html:114-116). */
export const THEME_MODES = [ 'light', 'dark', 'system' ];

/** Mode a fresh install starts on (also the PHP-emitted boot attribute). */
export const DEFAULT_THEME_MODE = 'light';

/** The media query System mode follows. */
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Coerce anything (stored string, stale value, null) into a valid mode.
 *
 * @param {*} value Raw candidate.
 * @return {string} One of THEME_MODES.
 */
export function normalizeThemeMode( value ) {
	return THEME_MODES.includes( value ) ? value : DEFAULT_THEME_MODE;
}

/**
 * The concrete scheme a mode resolves to right now.
 *
 * @param {string}  mode        Selected mode.
 * @param {boolean} prefersDark Current `prefers-color-scheme: dark` match.
 * @return {string} `light` or `dark`.
 */
export function resolveColorScheme( mode, prefersDark ) {
	if ( normalizeThemeMode( mode ) === 'system' ) {
		return prefersDark ? 'dark' : 'light';
	}
	return normalizeThemeMode( mode );
}

/**
 * Read the stored mode. Any storage failure (private mode, disabled cookies,
 * quota) resolves to the default instead of throwing.
 *
 * @param {Storage} storage Storage implementation (defaults to localStorage).
 * @return {string} Stored mode, or the default.
 */
export function readThemeMode( storage = safeStorage() ) {
	try {
		return normalizeThemeMode( storage?.getItem( THEME_STORAGE_KEY ) );
	} catch {
		return DEFAULT_THEME_MODE;
	}
}

/**
 * Persist the mode. Never throws — a failed write only costs persistence.
 *
 * @param {string}  mode    Mode to store.
 * @param {Storage} storage Storage implementation (defaults to localStorage).
 * @return {string} The normalized mode that was applied.
 */
export function writeThemeMode( mode, storage = safeStorage() ) {
	const next = normalizeThemeMode( mode );
	try {
		storage?.setItem( THEME_STORAGE_KEY, next );
	} catch {
		// Keep the current interaction working when persistent storage is unavailable.
	}
	return next;
}

/**
 * Write the resolved scheme onto the token scope. Falls back to the app root's
 * closest `.ap-token-scope` so both the SPA and the legacy standalone mount work.
 *
 * The scheme is ALSO mirrored onto `<body>`, together with the token-scope class
 * and visual preset, because `@wordpress/components` overlays (Modal,
 * ConfirmDialog, Popover) render through a portal appended to `document.body` —
 * outside the app's own scope, where neither the attribute nor the `--ap-*`
 * engine would otherwise resolve (styles/wp-components-dark.css keys off it).
 * Both markers only DECLARE custom properties; they paint nothing on their own,
 * so the surrounding WordPress chrome is untouched.
 *
 * @param {string}      scheme `light` or `dark`.
 * @param {Element|null} root  Explicit scope element (optional).
 */
export function applyColorScheme( scheme, root = themeScope() ) {
	const value = scheme === 'dark' ? 'dark' : 'light';
	if ( root ) {
		root.setAttribute( 'data-ap-color-scheme', value );
	}
	if ( typeof document !== 'undefined' && document.body ) {
		document.body.classList.add( 'ap-token-scope' );
		document.body.setAttribute( 'data-ap-visual', 'v2' );
		document.body.setAttribute( 'data-ap-color-scheme', value );
	}
}

/** The element carrying `data-ap-color-scheme` (AdminPage::renderRoot wrapper). */
export function themeScope() {
	if ( typeof document === 'undefined' ) {
		return null;
	}
	return (
		document.getElementById( 'aponto-admin-scope' ) ||
		document.getElementById( 'aponto-admin-root' )?.closest( '.ap-token-scope' ) ||
		null
	);
}

/** localStorage when the host allows it, else null (never throws). */
function safeStorage() {
	try {
		return typeof window !== 'undefined' ? window.localStorage : null;
	} catch {
		return null;
	}
}

/** Current `prefers-color-scheme: dark` state; false when matchMedia is absent. */
export function prefersDarkNow() {
	try {
		return Boolean( window.matchMedia && window.matchMedia( DARK_MEDIA_QUERY ).matches );
	} catch {
		return false;
	}
}

/**
 * Subscribe to OS scheme flips. Handles both the modern `addEventListener` and
 * the legacy `addListener` MediaQueryList API; returns an unsubscribe function.
 *
 * @param {Function} onChange Called with the new `prefersDark` boolean.
 * @return {Function} Unsubscribe.
 */
export function watchSystemScheme( onChange ) {
	let query = null;
	try {
		query = window.matchMedia ? window.matchMedia( DARK_MEDIA_QUERY ) : null;
	} catch {
		query = null;
	}
	if ( ! query ) {
		return () => {};
	}
	const handler = ( event ) => onChange( Boolean( event.matches ) );
	if ( query.addEventListener ) {
		query.addEventListener( 'change', handler );
		return () => query.removeEventListener( 'change', handler );
	}
	query.addListener( handler );
	return () => query.removeListener( handler );
}

/**
 * Subscribe to cross-tab preference changes: another Aponto tab writing the mode
 * fires a `storage` event here, and this tab follows it (same pattern as the
 * kit's dashboard-kit-preferences primary-color sync). Other keys are ignored,
 * and a cleared value normalizes to the default instead of blanking the scheme.
 *
 * @param {Function} onChange Called with the new normalized mode.
 * @return {Function} Unsubscribe.
 */
export function watchStoredScheme( onChange ) {
	if ( typeof window === 'undefined' || ! window.addEventListener ) {
		return () => {};
	}
	const handler = ( event ) => {
		if ( event?.key === THEME_STORAGE_KEY ) {
			onChange( normalizeThemeMode( event.newValue ) );
		}
	};
	window.addEventListener( 'storage', handler );
	return () => window.removeEventListener( 'storage', handler );
}

/** Icon alias for a mode's leading glyph (mockup: sun · moon · desktop). */
export function themeModeIcon( mode ) {
	if ( mode === 'dark' ) {
		return 'moon';
	}
	if ( mode === 'system' ) {
		return 'system';
	}
	return 'sun';
}

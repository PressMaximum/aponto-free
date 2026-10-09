/**
 * Appearance resolution — SPEC-P1 Q11 (2026-07-18).
 *
 * Block attributes (`accent`, `radius`) arrive through `data-props` and are
 * mapped to the three public shadow-root CSS variables: `--ap-color-accent`,
 * `--ap-color-on-accent` (auto-derived for AA contrast), and
 * `--ap-radius-control`. Every other token derives from these inside the shadow
 * stylesheet, so the widget stays self-contained and never depends on the
 * dashboard-kit token sheet.
 *
 * `maxWidth` (D-R49) is the same kind of override for the layout token
 * `--ap-layout-max`: set on the host, inherited by `.ap-wrap` — the element that
 * carries both the cap and the container query, so the query keeps measuring the
 * capped card.
 *
 * Two public `--ap-*` inputs are NOT block attributes and are set by the HOST
 * page when it needs them: `--ap-layout-max` above, and `--ap-sticky-offset`
 * (default `0px`, D-R52) — how much vertical room the host theme's own sticky
 * header takes, so the staff profile dialog opens clear of it. Nothing in this
 * module writes the second one; it is documented here because this is where the
 * public custom-property API is described.
 *
 * `colorScheme` is the fourth (additive) appearance attribute. It is NOT a CSS
 * variable — it becomes the `data-ap-color-scheme` attribute on the host element,
 * which selects the shadow stylesheet's opt-in dark token preset. The public
 * `--ap-*` custom-property API is unchanged.
 *
 * Pure module: no Preact, no DOM. Unit-testable.
 */

/**
 * Parse a `#rgb`/`#rrggbb` hex string to `[r,g,b]` (0-255), or null if invalid.
 *
 * @param {string} hex Hex color.
 * @return {?number[]} RGB triplet or null.
 */
export function hexToRgb( hex ) {
	if ( typeof hex !== 'string' ) {
		return null;
	}
	let h = hex.trim().replace( /^#/, '' );
	if ( h.length === 3 ) {
		h = h[ 0 ] + h[ 0 ] + h[ 1 ] + h[ 1 ] + h[ 2 ] + h[ 2 ];
	}
	if ( ! /^[0-9a-fA-F]{6}$/.test( h ) ) {
		return null;
	}
	return [
		parseInt( h.slice( 0, 2 ), 16 ),
		parseInt( h.slice( 2, 4 ), 16 ),
		parseInt( h.slice( 4, 6 ), 16 ),
	];
}

/**
 * sRGB channel → linear.
 * @param {number} c Channel value 0-255.
 */
function linearize( c ) {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : Math.pow( ( s + 0.055 ) / 1.055, 2.4 );
}

/**
 * WCAG relative luminance of an `[r,g,b]` color.
 *
 * @param {number[]} rgb RGB triplet.
 * @return {number} Luminance 0..1.
 */
export function relativeLuminance( rgb ) {
	return (
		0.2126 * linearize( rgb[ 0 ] ) +
		0.7152 * linearize( rgb[ 1 ] ) +
		0.0722 * linearize( rgb[ 2 ] )
	);
}

/**
 * WCAG contrast ratio between two `[r,g,b]` colors (1..21).
 *
 * @param {number[]} a First color.
 * @param {number[]} b Second color.
 * @return {number} Contrast ratio.
 */
export function contrastRatio( a, b ) {
	const la = relativeLuminance( a );
	const lb = relativeLuminance( b );
	const hi = Math.max( la, lb );
	const lo = Math.min( la, lb );
	return ( hi + 0.05 ) / ( lo + 0.05 );
}

const ON_LIGHT = '#ffffff';
const ON_DARK = '#1a1e25';

/**
 * The consent checkbox's checked glyph, stroked in `color`.
 *
 * The shadow stylesheet ships this same path as `--ap-checkbox-check-image` with
 * `stroke='white'`, which is right for the near-black-to-mid accents but goes
 * invisible on a light one (`#ffe600` and friends). A data URI is its own
 * document: it cannot read `currentColor` or `var(--ap-color-on-accent)`, so the
 * only way to follow the derived foreground is to re-emit the whole URL with the
 * colour baked in — the same restatement the dark preset already does for the
 * select chevron.
 *
 * @param {string} color Stroke colour (a validated hex — `#` is percent-encoded).
 * @return {string} A CSS `url()` value.
 */
function checkboxCheckImage( color ) {
	const stroke = color.replace( '#', '%23' );
	return (
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3.5 8.1 2.7 2.7 6.3-6.3' fill='none' stroke='" +
		stroke +
		"' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"
	);
}

/**
 * Choose a readable foreground for text/icons placed on the accent color,
 * picking whichever of white / near-black has the higher contrast. This keeps
 * the primary button legible at any accent, including fully custom colors
 * (SPEC-P1 §2.2 auto-contrast).
 *
 * @param {string} accentHex Accent hex.
 * @return {string} `#ffffff` or a near-black hex.
 */
export function deriveOnAccent( accentHex ) {
	const rgb = hexToRgb( accentHex );
	if ( ! rgb ) {
		return ON_LIGHT;
	}
	const white = hexToRgb( ON_LIGHT );
	const dark = hexToRgb( ON_DARK );
	return contrastRatio( rgb, white ) >= contrastRatio( rgb, dark )
		? ON_LIGHT
		: ON_DARK;
}

/**
 * Sanitize a radius value to a safe CSS length, defaulting to `4px`. Accepts a
 * bare number (interpreted as px) or a `<number><unit>` with an allow-listed
 * unit — never arbitrary CSS, so nothing hostile can be injected through the
 * block attribute.
 *
 * @param {string|number} value Raw radius.
 * @return {string} CSS length.
 */
export function sanitizeRadius( value ) {
	if ( typeof value === 'number' && isFinite( value ) ) {
		return Math.max( 0, value ) + 'px';
	}
	if ( typeof value !== 'string' ) {
		return '4px';
	}
	const v = value.trim();
	if ( /^\d+(\.\d+)?$/.test( v ) ) {
		return v + 'px';
	}
	if ( /^\d+(\.\d+)?(px|rem|em|%)$/.test( v ) ) {
		return v;
	}
	return '4px';
}

/** Bounds of the per-block card width cap, in px (D-R49). */
export const MAX_WIDTH_MIN = 480;
export const MAX_WIDTH_MAX = 1140;
/** The stylesheet's own `--ap-layout-max` (D-R49). */
export const MAX_WIDTH_DEFAULT = 960;

/**
 * Sanitize the `maxWidth` appearance attribute to an integer px value clamped to
 * `480..1140`, or null when it is not a number at all (the stylesheet default
 * then applies). Numbers only — never a CSS string — so nothing can be injected
 * through the block attribute.
 *
 * @param {*} value Raw attribute value.
 * @return {?number} Clamped integer px, or null.
 */
export function sanitizeMaxWidth( value ) {
	const n =
		typeof value === 'string' && /^\d+(\.\d+)?$/.test( value.trim() )
			? parseFloat( value )
			: value;
	if ( typeof n !== 'number' || ! isFinite( n ) ) {
		return null;
	}
	return Math.max( MAX_WIDTH_MIN, Math.min( MAX_WIDTH_MAX, Math.floor( n ) ) );
}

/**
 * Supported color schemes. There is deliberately NO `auto`/`system` value: the
 * block is the single source of truth for the public form's skin (founder ruling
 * 2026-08-01), so nothing here can resolve to "follow the OS".
 */
export const COLOR_SCHEMES = [ 'light', 'dark' ];

/**
 * Sanitize the `colorScheme` appearance attribute to the supported allow-list.
 *
 * Light-first by design: the v4 reference pins `html{color-scheme:light}` and
 * scopes its dark tokens to an explicit stage. An unset or unknown value —
 * including legacy `auto`/`system` strings — resolves to `light`.
 *
 * @param {*} value Raw attribute value.
 * @return {string} `light` | `dark`.
 */
export function sanitizeColorScheme( value ) {
	if ( typeof value !== 'string' ) {
		return 'light';
	}
	const v = value.trim().toLowerCase();
	return COLOR_SCHEMES.includes( v ) ? v : 'light';
}

/**
 * Card elevation steps (founder review 2026-09-30): `flat` is the hairline frame with no
 * shadow; `sm`/`md`/`lg` are borderless shadow steps. `sm` is the default.
 */
export const SHADOWS = [ 'flat', 'sm', 'md', 'lg' ];

/**
 * Resolve the `data-ap-shadow` host attribute from the appearance object. Like the colour
 * scheme it is an attribute, not a custom property: the shadow stylesheet maps each step to
 * its token with `:host([data-ap-shadow="…"])`.
 *
 * @param {Object} appearance `{shadow?}` from data-props.
 * @return {string} One of {@link SHADOWS}.
 */
export function resolveShadow( appearance ) {
	const v = ( appearance || {} ).shadow;
	const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
	return SHADOWS.includes( s ) ? s : 'sm';
}

/**
 * Resolve the `data-ap-color-scheme` host attribute from the appearance object.
 *
 * @param {Object} appearance `{colorScheme?}` from data-props.
 * @return {string} `light` | `dark`.
 */
export function resolveColorScheme( appearance ) {
	return sanitizeColorScheme( ( appearance || {} ).colorScheme );
}

/**
 * Resolve the appearance block attributes into the three overridable public
 * tokens. Returns only the properties that were explicitly supplied (plus the
 * derived on-accent when an accent is given, and the matching checkbox glyph when
 * that foreground is not the sheet's white default), so unset attributes fall back
 * to the shadow stylesheet defaults. `colorScheme` is deliberately NOT part of this
 * map — it is an attribute, not a custom property (see {@link resolveColorScheme}).
 *
 * @param {Object} appearance `{accent?, onAccent?, radius?, maxWidth?}` from data-props.
 * @return {Object<string,string>} CSS custom properties to set on the host.
 */
export function resolveAppearanceVars( appearance ) {
	const out = {};
	const a = appearance || {};

	const accent = hexToRgb( a.accent ) ? a.accent.trim() : null;
	if ( accent ) {
		const onAccent = hexToRgb( a.onAccent )
			? a.onAccent.trim()
			: deriveOnAccent( accent );
		out[ '--ap-color-accent' ] = accent;
		out[ '--ap-color-on-accent' ] = onAccent;

		// Everything painted ON the accent has to follow that foreground, and the
		// consent checkbox's tick is a background image, not text — so it cannot
		// inherit it. Restate the glyph whenever the foreground is anything but
		// the sheet's white default (a light accent derives the near-black), and
		// leave the white-stroke default in place otherwise.
		if ( onAccent.toLowerCase() !== ON_LIGHT ) {
			out[ '--ap-checkbox-check-image' ] = checkboxCheckImage( onAccent );
		}
	}

	if ( a.radius !== undefined && a.radius !== null && a.radius !== '' ) {
		out[ '--ap-radius-control' ] = sanitizeRadius( a.radius );
	}

	const maxWidth = sanitizeMaxWidth( a.maxWidth );
	if ( maxWidth !== null ) {
		out[ '--ap-layout-max' ] = maxWidth + 'px';
	}

	return out;
}

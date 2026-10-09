/**
 * Block-attribute → widget-input mapping for the editor preview.
 *
 * Extracted from `editor.jsx` (fix round 1) so it can be unit-tested without loading the
 * `@wordpress/blocks` registration side effects: the bug this module exists to prevent —
 * an inspector control that moves and a preview that does not — is invisible in review and
 * trivial to assert here.
 *
 * Two outputs, and the split between them is the whole contract:
 *
 *  - {@link propsFor} is what the host's `data-props` carries, i.e. what `resolveConfig()`
 *    will read.
 *  - {@link mountKeyFor} is everything that needs a FRESH MOUNT when it changes. A shadow
 *    root can only be attached once, so the editor rebuilds the host element whenever this
 *    string changes. Appearance tokens are deliberately NOT in it — accent, radius, max
 *    width and the colour scheme are CSS custom properties (or a host attribute) and repaint
 *    live. Everything the widget's RENDER branches on must be, or the preview lies.
 */

import { __ } from '@wordpress/i18n';

/** The `layout` value of the one-page frame (D-R80). */
export const ONE_PAGE = 'one-page';

/**
 * Whether a block asks for the one-page frame (D-R80). Also the variation's `isActive`, so the
 * block card and the inserter name the variation exactly when the attribute says so.
 *
 * @param {?Object} attributes Block attributes.
 * @return {boolean} One page.
 */
export function isOnePage( attributes ) {
	return !! attributes && ONE_PAGE === attributes.layout;
}

/**
 * Whether the inspector must warn about the block's service (D-R80), and why — once the list has
 * loaded (an unloaded list says nothing yet):
 *
 *  - `missing` — the block pins a service the catalogue no longer lists (deleted, inactive,
 *    draft). In EITHER flow and whatever the catalogue size (QA D01, 2026-10-05): the widget never
 *    swaps another service in — one page says "no longer available", step by step shows the
 *    Service step — so the operator has to know;
 *  - `choose` — a one-page block pins no service on a site with more than one, so the visitor
 *    gets the step-by-step form. A lone service qualifies on its own.
 *
 * @param {?Object} attributes Block attributes.
 * @param {?Array}  services   `/public/services` items, or null while loading.
 * @return {string} `choose`, `missing`, or '' for no notice.
 */
export function serviceNotice( attributes, services ) {
	// An empty list says nothing either: it is also what a failed or unauthenticated read
	// resolves to, and a false "no longer available" would be worse than none.
	if ( ! Array.isArray( services ) || ! services.length ) {
		return '';
	}
	const a = attributes || {};
	if ( a.serviceId ) {
		const id = Number( a.serviceId );
		return services.some( ( s ) => Number( s.id ) === id ) ? '' : 'missing';
	}
	return isOnePage( a ) && services.length > 1 ? 'choose' : '';
}

/**
 * The service a one-page block should be PINNED to when it gets the flow (QA D13, 2026-10-05):
 * the site's only active service, when the block names none — so adding a second service later
 * cannot silently turn the page into the step-by-step form. `null` when there is nothing to pin.
 *
 * @param {?Object} attributes Block attributes (after the change).
 * @param {?Array}  services   `/public/services` items, or null while loading.
 * @return {?number} Service id to write, or null.
 */
export function serviceToPin( attributes, services ) {
	const a = attributes || {};
	if ( ! isOnePage( a ) || a.serviceId || ! Array.isArray( services ) ) {
		return null;
	}
	return 1 === services.length ? Number( services[ 0 ].id ) || null : null;
}

/**
 * The inserter entry for the one-page frame (D-R80): a VARIATION of `aponto/booking-form`, not a
 * second block — same attributes, same render, one saved shape — and not a block style, whose
 * `is-style-*` class would land outside the ShadowRoot the form renders in.
 *
 * @return {Object} Block variation.
 */
export function onePageVariation() {
	return {
		name: 'one-page-booking',
		// Named after the FLOW, not the content (founder 2026-10-03): beside "Aponto Booking Form"
		// in the inserter, "Service Booking" read as a different product.
		title: __( 'Aponto One-Page Booking', 'aponto' ),
		// True at any width (QA D21): side by side only when the block is wide, stacked otherwise.
		description: __(
			'Book one service on one page: what it is, the calendar and the details form.',
			'aponto'
		),
		// Found by what people search for (QA D19, 2026-10-05).
		keywords: [
			__( 'call', 'aponto' ),
			__( 'meeting', 'aponto' ),
			__( 'consultation', 'aponto' ),
			__( 'appointment', 'aponto' ),
			__( 'one page', 'aponto' ),
			__( 'scheduling', 'aponto' ),
		],
		// Wide by default (QA D21): the intro and the calendar sit side by side from a 700px card.
		attributes: { layout: ONE_PAGE, align: 'wide' },
		// The inserter preview mounts the live widget like the canvas does (D-R80): wide enough
		// for the two-column frame.
		example: { attributes: { layout: ONE_PAGE }, viewportWidth: 960 },
		scope: [ 'inserter', 'transform' ],
		isActive: isOnePage,
	};
}

/**
 * Decode the HTML entities `esc_attr()` produces (named + numeric) — node-safe, no DOM.
 *
 * @param {string} s Attribute value as printed.
 * @return {string} Decoded text.
 */
function decodeAttr( s ) {
	return s
		.replace( /&#x([0-9a-f]+);/gi, ( _, h ) =>
			String.fromCodePoint( parseInt( h, 16 ) )
		)
		.replace( /&#(\d+);/g, ( _, d ) =>
			String.fromCodePoint( parseInt( d, 10 ) )
		)
		.replace( /&quot;/g, '"' )
		.replace( /&lt;/g, '<' )
		.replace( /&gt;/g, '>' )
		.replace( /&amp;/g, '&' );
}

/**
 * The `host` the SERVER resolved for a block (D-R85), read from that block's server render —
 * the `/wp/v2/block-renderer` response the editor preview fetches, because the host is resolved
 * by `BlockRegistrar` / `Frontend\HostLine` at render time and nowhere else. ONLY `host` is taken;
 * anything malformed is null (the widget's `normalizeHost()` is the second gate).
 *
 * @param {*} html Rendered block HTML.
 * @return {?Object} Raw host payload, or null.
 */
export function hostFromRendered( html ) {
	if ( typeof html !== 'string' ) {
		return null;
	}
	const m = html.match( /data-props="([^"]*)"/ );
	if ( ! m ) {
		return null;
	}
	try {
		const props = JSON.parse( decodeAttr( m[ 1 ] ) );
		return props && typeof props.host === 'object' && props.host
			? props.host
			: null;
	} catch {
		return null;
	}
}

/**
 * The attributes the host depends on (D-R85) — what the editor sends to the server render, and
 * the key it refetches on. `null` when the preview must show no host at all (Step by step, or
 * "Show host" off), so the line disappears at once, before any request.
 *
 * @param {?Object} attributes Block attributes.
 * @return {?Object} Request attributes, or null.
 */
export function hostRequestFor( attributes ) {
	const a = attributes || {};
	if ( ONE_PAGE !== a.layout || false === a.showHost ) {
		return null;
	}
	const out = { layout: ONE_PAGE };
	[ 'serviceId', 'staffId', 'locationId' ].forEach( ( k ) => {
		if ( Number.isInteger( a[ k ] ) && a[ k ] > 0 ) {
			out[ k ] = a[ k ];
		}
	} );
	return out;
}

/** Build the widget `appearance` object from block attributes. */
export function appearanceFor( attributes ) {
	const a = attributes || {};
	const appearance = {};
	if ( a.accent ) {
		appearance.accent = a.accent;
	}
	if ( a.radius !== undefined && a.radius !== null && a.radius !== '' ) {
		appearance.radius = a.radius;
	}
	if ( a.colorScheme ) {
		appearance.colorScheme = a.colorScheme;
	}
	if ( typeof a.maxWidth === 'number' ) {
		appearance.maxWidth = a.maxWidth;
	}
	if ( a.shadow && 'sm' !== a.shadow ) {
		appearance.shadow = a.shadow;
	}
	return appearance;
}

/** Build the host `data-props` payload from block attributes. */
export function propsFor( attributes ) {
	const a = attributes || {};
	return {
		serviceId: a.serviceId ?? null,
		staffId: a.staffId ?? null,
		locationId: a.locationId ?? null,
		layout: a.layout || 'default',
		summaryMode: a.summaryMode || 'always',
		// `''` = inherit the site setting (D-R52). Passed through as-is; the widget's own
		// normalizer treats anything outside the allow-list as inherit.
		staffLayout: a.staffLayout || '',
		stepDisplay: a.stepDisplay || 'horizontal',
		contactHelp: false !== a.contactHelp,
		contactText: a.contactText || '',
		// The one-page meeting-method line (D-R82); the widget re-validates both.
		meetingType: a.meetingType || '',
		meetingText: a.meetingText || '',
		// D-R84: only an explicit choice travels; unset follows the flow in the widget.
		preselectDate:
			'boolean' === typeof a.preselectDate ? a.preselectDate : undefined,
		// The host line's switch (D-R85). The PEOPLE are resolved by the server at render time,
		// so the editor preview — which has no server render — shows no host line.
		showHost: 'boolean' === typeof a.showHost ? a.showHost : undefined,
		appearance: appearanceFor( a ),
	};
}

/**
 * The remount key: every attribute the widget's RENDER reads, and nothing else.
 *
 * `staffLayout` and `stepDisplay` were missing from the first cut of D-R52/D-R53, so both
 * inspector controls changed the saved attribute and left the preview on the old markup
 * (Codex fix round 1, P2-3). `locationId` (D-R62) is in it from the start: a preset location
 * removes the Location step and changes every request the preview makes.
 */
export function mountKeyFor( attributes ) {
	const a = attributes || {};
	return [
		a.serviceId || '',
		a.staffId || '',
		a.locationId || '',
		a.layout || 'default',
		a.summaryMode || 'always',
		a.staffLayout || '',
		a.stepDisplay || 'fraction',
	]
		// The contact-help line is RENDER, not paint (founder review 2026-09-30). Appended
		// only off its default, so a block saved before it existed keys exactly as before.
		.concat(
			false === a.contactHelp || a.contactText
				? [ false === a.contactHelp ? 'nohelp' : 'help', a.contactText || '' ]
				: []
		)
		// The meeting-method line (D-R82) is RENDER too; appended only when set, so a block
		// without it keys exactly as before.
		.concat(
			a.meetingType ? [ 'meet', a.meetingType, a.meetingText || '' ] : []
		)
		// Preselect the first day (D-R84): RENDER, keyed only when set explicitly.
		.concat(
			'boolean' === typeof a.preselectDate
				? [ a.preselectDate ? 'pre' : 'nopre' ]
				: []
		)
		// The host line's switch (D-R85), keyed only when set explicitly.
		.concat( false === a.showHost ? [ 'nohost' ] : [] )
		.join( ':' );
}

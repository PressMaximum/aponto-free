/**
 * Settings information architecture (mockup SPEC §7.9 — "Settings retains a
 * parent → child hierarchy and hash-deep-link contract").
 *
 * The v4 mockup replaces the flat tab strip with an icon-decorated tree whose
 * leaves are hash-deep-linkable as `#settings/<parent>/<child>`
 * (docs/mockups/v4/plugin-dashboard/assets/js/plugin-dashboard.js:48-65, 396-412).
 * This module owns that tree and every pure routing decision derived from it, so
 * the shell, the Settings ▾ dropdown, the rail and the unit tests all read one
 * source. Rendering lives in routes/SettingsRoute.jsx; the field/panel copy stays
 * in ./catalog.js.
 *
 * PRODUCTION SUBSET (mockup §5.4 + §13 — "a badge-only route must not become
 * working production UI", and phase labels never enter production copy). Two
 * mockup entries are deliberately omitted rather than shipped as dead links:
 *
 *   - `Appearance` (mockup phase tag `P1b`) — Q11 2026-07-18 moved booking-form
 *     appearance to the block Inspector, so there is no Appearance settings
 *     surface. Its schema keys still round-trip through PUT /settings untouched
 *     (see catalog.js). `#settings/appearance` aliases to the default section.
 *   - `Notifications → Email templates / Delivery` — the folded B3 app is ONE
 *     surface with ONE dirty state and ONE `PUT /notifications` (templates +
 *     sender ride the same save), so splitting it across two child routes would
 *     silently drop edits. Notifications therefore ships as a leaf; its mockup
 *     children stay a design seam.
 *
 * The mockup's `P1b` phase tags are mockup-only planning metadata and are NOT
 * rendered here (mockup SPEC §7.8: "never appearing in production admin copy").
 *
 * Legacy hash aliases (bookmarks from the flat 5-tab rail keep working — the
 * route resolves and the shell rewrites the hash with `replaceState`):
 *
 *   #settings                → #settings/general/business
 *   #settings/general        → #settings/general/business
 *   #settings/booking        → #settings/booking/policy
 *   #settings/notifications  → #settings/notifications   (leaf, unchanged)
 *   #settings/privacy        → #settings/privacy         (leaf, unchanged)
 *   #settings/advanced       → #settings/advanced        (leaf, unchanged)
 *   #settings/<unknown>      → #settings/general/business
 *   #settings/<parent>/<unknown child> → that parent's first child
 */
import { __ } from '@wordpress/i18n';

/** Hash root segment for every settings deep link. */
export const SETTINGS_ROUTE = 'settings';

/**
 * The parent → child tree, in mockup order.
 *
 * Node shape:
 *   id          hash segment
 *   label       visible copy
 *   icon        icons.js alias (mockup `settingsIcon`)
 *   description dropdown sub-line for a LEAF (parents list their children instead)
 *   children    [ { id, label, panels, extras } ] — a parent renders no content itself
 *   panels      schema panel slugs rendered by SettingsApp (leaf only)
 *   extras      non-schema surfaces appended by SettingsApp (leaf only)
 *   component   a leaf handed to a component instead of the schema form
 */
export const SETTINGS_TREE = [
	{
		id: 'general',
		label: __( 'General', 'aponto' ),
		icon: 'briefcase',
		children: [
			{
				id: 'business',
				label: __( 'Business', 'aponto' ),
				panels: [ 'business' ],
				// Business hours are the business's own operating record (§1.3) and stay
				// on the default landing section so the Dashboard "Manage" deep link
				// (routes/Dashboard.jsx → window.__apontoScrollToHours) still lands on them.
				extras: [ 'business-hours' ],
			},
			{
				id: 'localization',
				label: __( 'Localization', 'aponto' ),
				panels: [ 'localization' ],
			},
		],
	},
	{
		id: 'booking',
		label: __( 'Booking', 'aponto' ),
		icon: 'calendar',
		children: [
			{
				id: 'policy',
				label: __( 'Policy', 'aponto' ),
				// The `staff` panel (D-R52) rides this section rather than a nav leaf of its
				// own: every key in it is gated on `multi_staff`, so a dedicated leaf would be
				// an empty screen on Free and on any build without the module. Rendered as its
				// own card under Booking policy, with its own heading. `location` (D-R61) rides
				// it for the same reason, gated on `multi_location`.
				panels: [ 'policy', 'staff', 'location' ],
			},
			{
				// Payments (D-R38, 2026-09-04). A CHILD of Booking rather than a tab of its own,
				// because these three keys are booking policy — what the site requires before a slot
				// is somebody's — and they apply to every gateway. A gateway's OWN configuration
				// (keys, webhook, receipts) lives on its module panel at `#modules/{code}`; putting
				// either half in the other's place is how a site ends up with two places that both
				// look like "payment settings".
				id: 'payments',
				label: __( 'Payments', 'aponto' ),
				panels: [ 'payments' ],
			},
			{
				// The mockup's Booking → Form presentation child states the form contract
				// rather than exposing per-install settings (plugin-dashboard.js:366).
				// Production's real content for it is the booking-form appearance pointer
				// (Q11: accent + radius live in the block Inspector) and, since D-R75, WHICH
				// page hosts the form — the one setting the onboarding wizard used to own alone.
				id: 'form',
				label: __( 'Form presentation', 'aponto' ),
				panels: [],
				extras: [ 'booking-page', 'appearance-hint' ],
			},
		],
	},
	{
		id: 'notifications',
		label: __( 'Notifications', 'aponto' ),
		icon: 'bell',
		// Kept to the mockup's ~30-character sub-line budget: the dropdown row is
		// 260px wide and ellipsises anything longer.
		description: __( 'Templates, sender and send log', 'aponto' ),
		component: 'notifications',
	},
	{
		id: 'privacy',
		label: __( 'Privacy', 'aponto' ),
		icon: 'shield',
		description: __( 'Retention, export and erasure', 'aponto' ),
		panels: [ 'collection', 'consent', 'retention' ],
		extras: [ 'privacy-launcher' ],
	},
	{
		id: 'advanced',
		label: __( 'Advanced', 'aponto' ),
		icon: 'sliders',
		description: __( 'Diagnostics, logs and uninstall', 'aponto' ),
		panels: [ 'diagnostics', 'data' ],
		extras: [ 'system-status' ],
	},
];

/** The parent that a bare `#settings` (or an unknown parent) resolves to. */
export const DEFAULT_SETTINGS_PARENT = SETTINGS_TREE[ 0 ].id;

/** Look up a parent node by id. Returns null for unknown ids. */
export function settingsNode( parentId ) {
	return SETTINGS_TREE.find( ( node ) => node.id === parentId ) || null;
}

/** Children of a parent id (empty array for a leaf or an unknown id). */
export function settingsChildren( parentId ) {
	const node = settingsNode( parentId );
	return node && Array.isArray( node.children ) ? node.children : [];
}

/** First child id of a parent, or '' when the node is a leaf. */
export function defaultSettingsChild( parentId ) {
	return settingsChildren( parentId )[ 0 ]?.id || '';
}

/**
 * Canonical hash path (no leading `#`) for a section.
 *
 * @param {string} parentId Parent node id.
 * @param {string} childId  Child id; ignored when the parent is a leaf.
 * @return {string} e.g. `settings/general/business` or `settings/advanced`.
 */
export function settingsPath( parentId, childId = '' ) {
	return childId ? `${ SETTINGS_ROUTE }/${ parentId }/${ childId }` : `${ SETTINGS_ROUTE }/${ parentId }`;
}

/**
 * Resolve raw hash segments to a valid parent/child pair.
 *
 * Every unknown or legacy shape falls back to a real section, which is what makes
 * the old flat URLs (`#settings/general`, `#settings/appearance`, …) keep working.
 *
 * @param {Array<string>} segments Hash segments, e.g. `[ 'settings', 'general' ]`.
 * @return {{parent: string, child: string}} Resolved section ids.
 */
export function resolveSettingsRoute( segments ) {
	const list = Array.isArray( segments ) ? segments : [];
	// Segment 0 is the route itself; the tree starts at segment 1.
	const requestedParent = list[ 0 ] === SETTINGS_ROUTE ? list[ 1 ] : list[ 0 ];
	const parent = settingsNode( requestedParent ) ? requestedParent : DEFAULT_SETTINGS_PARENT;
	const children = settingsChildren( parent );
	if ( ! children.length ) {
		return { parent, child: '' };
	}
	const requestedChild = list[ 0 ] === SETTINGS_ROUTE ? list[ 2 ] : list[ 1 ];
	const child = children.some( ( item ) => item.id === requestedChild )
		? requestedChild
		: children[ 0 ].id;

	return { parent, child };
}

/**
 * The rendering descriptor for a resolved section: what SettingsRoute mounts and
 * what SettingsApp renders inside it.
 *
 * @param {string} parentId Resolved parent id.
 * @param {string} childId  Resolved child id ('' for a leaf).
 * @return {{parent: object, child: (object|null), label: string, panels: Array<string>, extras: Array<string>, component: string}} Section descriptor.
 */
export function settingsSection( parentId, childId = '' ) {
	const parent = settingsNode( parentId ) || SETTINGS_TREE[ 0 ];
	const child = settingsChildren( parent.id ).find( ( item ) => item.id === childId ) || null;
	const source = child || parent;

	return {
		parent,
		child,
		label: child ? `${ parent.label } · ${ child.label }` : parent.label,
		panels: Array.isArray( source.panels ) ? source.panels : [],
		extras: Array.isArray( source.extras ) ? source.extras : [],
		component: source.component || '',
	};
}

/**
 * Dropdown sub-line for a tree node: a parent advertises its children, a leaf its
 * own description (mockup `navDropdown(..., settingsMenu = true)`).
 *
 * @param {object} node Tree node.
 * @return {string} Sub-line copy.
 */
export function settingsMenuSubline( node ) {
	const children = settingsChildren( node?.id );
	return children.length
		? children.map( ( child ) => child.label ).join( ' · ' )
		: node?.description || '';
}

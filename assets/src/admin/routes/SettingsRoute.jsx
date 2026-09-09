/**
 * Settings route (SPEC-P1 §1.6 + mockup SPEC §7.9 — "Settings retains a parent →
 * child hierarchy and hash-deep-link contract").
 *
 * The rail is the mockup's icon-decorated tree, not a flat tab strip: parents
 * disclose their children (`aria-expanded` + `role="group"`), leaves activate
 * directly, and the active node carries `aria-current="page"`
 * (docs/mockups/v4/plugin-dashboard/assets/js/plugin-dashboard.js:396-412). Hash
 * deep links reach the leaf — `#settings/<parent>/<child>` — and every legacy
 * flat URL aliases onto a real section (see ../settings/ia.js for the map).
 *
 * The four schema sections render through SettingsApp; Notifications folds in the
 * B3 template editor unchanged (same bundle, same `window.apontoAdmin` boot
 * contract). Setup-wizard re-entry lives in the header (the wizard menu item
 * disappears after completion; the page stays URL-reachable).
 *
 * Section switches navigate through the hash router — the rail sets
 * `location.hash` exactly like every other nav in the app, so `hashchange` fires,
 * `App.useRoute()` stays current (Settings ▾ marks the right parent) and Back
 * traverses sections. `replaceState` is reserved for silently canonicalizing an
 * incoming legacy/unknown URL, which must not leave a history entry.
 *
 * Section switches run through the nav guard (C1 review fix 2): while the schema
 * form is dirty, switching asks for confirmation instead of silently unmounting
 * the form. Because every switch now arrives as a route change, the guard lives
 * in ONE place (the segments effect) and covers clicks and Back/Forward alike.
 * Route-level changes are guarded centrally in the router.
 *
 * Keyboard: the rail is navigation, not a tablist, so Arrow/Home/End move FOCUS
 * across the visible nodes without activating them (SPEC §11 roving focus). That
 * also keeps arrow keys from firing the dirty-form confirm on every keypress.
 */
import { useState, useEffect, useRef } from 'react';
import { __ } from '@wordpress/i18n';
import { config } from '../lib/config.js';
import { renderIcon } from '../lib/icon.jsx';
import { requestNav } from '../lib/nav-guard.js';
import { PageHeader } from '../lib/ui.jsx';
import {
	SETTINGS_TREE,
	resolveSettingsRoute,
	settingsChildren,
	settingsPath,
	settingsSection,
} from '../settings/ia.js';
import SettingsApp from '../settings/SettingsApp.jsx';
import NotificationsApp from '../notifications/NotificationsApp';

/**
 * Rewrite the hash IN PLACE — no history entry, and (deliberately) no
 * `hashchange`.
 *
 * Reserved for SILENT CANONICALIZATION of an incoming URL: every legacy or
 * unknown shape in the ../settings/ia.js alias table (`#settings`,
 * `#settings/booking`, `#settings/appearance`, a stale bookmark…) resolves to a
 * real section and the address bar is corrected without polluting history —
 * Back from an aliased entry must leave Settings, not bounce between two
 * spellings of the same section.
 *
 * User-initiated navigation must NOT use this (see `selectSection`).
 */
function canonicalizeHash( parent, child ) {
	const target = settingsPath( parent, child );
	if ( window.location.hash.slice( 1 ) !== target ) {
		window.history.replaceState( null, '', `#${ target }` );
	}
}

export function SettingsRoute( { segments } ) {
	// The hash is the single source of truth for the visible section; this state
	// only LAGS it while the dirty-form guard is deciding, because the point of the
	// guard is not to unmount a dirty form before the user has answered.
	const [ section, setSection ] = useState( () => resolveSettingsRoute( segments ) );
	const navRef = useRef( null );

	// One reconciliation point for every way the section can change: a rail click,
	// the Settings ▾ menu, a deep link, browser Back/Forward. They all land here as
	// new `segments`, so the guard prompt is written once and behaves identically.
	useEffect( () => {
		const next = resolveSettingsRoute( segments );
		// Legacy/unknown URLs get corrected first, in place — no history entry.
		canonicalizeHash( next.parent, next.child );
		if ( next.parent === section.parent && next.child === section.child ) {
			// Nothing to do — also where a cancelled switch lands once its hash has
			// bounced back here, which is what keeps the guard from firing twice.
			return;
		}
		requestNav(
			() => setSection( next ),
			// User kept the unsaved edits: bounce the hash back through the router
			// rather than `replaceState`, so `App.useRoute()` segments (Settings ▾
			// current parent, WP submenu sync) match what is actually on screen. The
			// round-trip re-enters this effect and exits at the equality check above.
			// This costs one history entry per cancelled switch, which is the cheaper
			// bug: `replaceState` would leave the shell's segments pointing at the
			// section the user just refused — the stale-parent regression itself.
			() => {
				window.location.hash = settingsPath( section.parent, section.child );
			}
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- follow external segment changes only.
	}, [ segments ] );

	// Rail activation is real navigation, so it goes through the hash router like
	// every other nav in the app (lib/router.js `navigate`): assigning
	// `location.hash` fires `hashchange`, which is what keeps `App.useRoute()` from
	// going stale — `replaceState` fires nothing and left the Settings ▾ dropdown
	// marking a stale parent (Codex review 2026-07-25). It also PUSHES a history
	// entry on purpose: a user section change is a place the user can go Back from.
	// The dirty-form guard is intentionally not consulted here — the effect above
	// owns it, so clicks and Back/Forward share exactly one prompt.
	const selectSection = ( parent, child ) => {
		if ( parent === section.parent && child === section.child ) {
			return;
		}
		window.location.hash = settingsPath( parent, child );
	};

	// Arrow/Home/End move focus over whatever the rail currently shows (parents
	// plus the open parent's children); activation stays on Enter/Space/click.
	const onRailKeyDown = ( event ) => {
		const keys = [ 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End' ];
		if ( ! keys.includes( event.key ) ) {
			return;
		}
		const nodes = [ ...( navRef.current?.querySelectorAll( 'button' ) || [] ) ];
		if ( ! nodes.length ) {
			return;
		}
		event.preventDefault();
		const index = nodes.indexOf( document.activeElement );
		const last = nodes.length - 1;
		let next = index;
		if ( event.key === 'Home' ) {
			next = 0;
		} else if ( event.key === 'End' ) {
			next = last;
		} else if ( event.key === 'ArrowDown' || event.key === 'ArrowRight' ) {
			next = index >= last ? 0 : index + 1;
		} else {
			next = index <= 0 ? last : index - 1;
		}
		nodes[ next ]?.focus();
	};

	const wizardAction = config.wizardUrl ? (
		<a className="pd-button is-ghost" href={ config.wizardUrl }>
			{ renderIcon( 'arrows' ) }
			{ __( 'Open setup wizard', 'aponto' ) }
		</a>
	) : null;

	const active = settingsSection( section.parent, section.child );

	// No `.pd-page` wrapper here: the mockup's settings screen is full-bleed inside
	// `.pd-main.is-settings`, while `.pd-page` re-centers content at max-width 1320px.
	// The page header therefore rides inside the padded right-hand column.
	return (
		<div className="ap-settings-layout">
			<nav
				className="ap-settings-nav"
				ref={ navRef }
				aria-label={ __( 'Settings sections', 'aponto' ) }
				onKeyDown={ onRailKeyDown }
			>
				{ SETTINGS_TREE.map( ( node ) => (
					<SettingsNode
						key={ node.id }
						node={ node }
						section={ section }
						onSelect={ selectSection }
					/>
				) ) }
			</nav>
			<div
				className="ap-settings-panel"
				id="ap-settings-panel"
				role="region"
				aria-label={ active.label }
			>
				<PageHeader title={ __( 'Settings', 'aponto' ) } actions={ wizardAction } />
				{ active.component === 'notifications' ? (
					<NotificationsApp />
				) : (
					// Deliberately NOT keyed per section: the form holds the full
					// `GET /settings` payload plus its concurrency revision (§2.11
					// addendum), so remounting on every section switch would refetch
					// and drop that context for no gain.
					<SettingsApp panels={ active.panels } extras={ active.extras } />
				) }
			</div>
		</div>
	);
}

/**
 * One rail node: a leaf button, or a parent disclosure plus its child group.
 * The mockup keeps exactly one parent open — the active one — so the tree never
 * grows a second interaction (expand vs. select) for the same click.
 */
function SettingsNode( { node, section, onSelect } ) {
	const children = settingsChildren( node.id );
	const open = section.parent === node.id;

	if ( ! children.length ) {
		return (
			<button
				className="ap-settings-node is-leaf"
				type="button"
				aria-current={ open ? 'page' : undefined }
				onClick={ () => onSelect( node.id, '' ) }
			>
				{ renderIcon( node.icon, 'ap-settings-node-icon' ) }
				<span>{ node.label }</span>
			</button>
		);
	}

	// `aria-controls` only points at the group while it exists: a collapsed branch
	// renders no children, and a dangling reference is worse than none.
	const groupId = `ap-settings-group-${ node.id }`;
	return (
		<div className={ `ap-settings-branch${ open ? ' is-open' : '' }` }>
			<button
				className="ap-settings-node"
				type="button"
				aria-expanded={ open }
				aria-controls={ open ? groupId : undefined }
				onClick={ () => onSelect( node.id, children[ 0 ].id ) }
			>
				{ renderIcon( node.icon, 'ap-settings-node-icon' ) }
				<span>{ node.label }</span>
				{ renderIcon( 'chevron', 'ap-settings-node-caret' ) }
			</button>
			{ open ? (
				<div
					className="ap-settings-children"
					id={ groupId }
					role="group"
					aria-label={ node.label }
				>
					{ children.map( ( child ) => (
						<button
							key={ child.id }
							className="ap-settings-child"
							type="button"
							aria-current={ section.child === child.id ? 'page' : undefined }
							onClick={ () => onSelect( node.id, child.id ) }
						>
							{ child.label }
						</button>
					) ) }
				</div>
			) : null }
		</div>
	);
}

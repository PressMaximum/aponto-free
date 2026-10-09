/**
 * Shared in-flow inspector workspace (mockup §6.7). A two-column push layout:
 * the list stays interactive (no backdrop / body-lock / focus-trap / inert) while
 * an inspector or quick-view opens beside it, with a keyboard + pointer resizer
 * and a per-route persisted width. Extracted from the Bookings route so Customers,
 * Services (quick view) and module-owned inspectors share one shell; it reuses the
 * existing `.pd-bookings-workspace` / `.pd-booking-inspector` / `.pd-inflow-resizer`
 * chrome (the mockup's shared inspector), so module-owned inspectors can reuse it without
 * reintroducing a standalone core route or authoring new table/shell CSS.
 *
 * The width itself lives in `lib/inspector-width.js`, which the Bookings route shares: the
 * rendered width answers to the workspace it is actually in, not only to the stored preference.
 */
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from '@wordpress/element';
import { MIN_W, useInspectorWidth } from './inspector-width.js';

/**
 * PAGE-HEAD HOSTING. A page shell that renders its own heading above a panel (the
 * `#modules/{code}` route: breadcrumb `h1`, description, module subnav) pushes an inspector
 * workspace down the page: the inspector then starts mid-page instead of under the shell
 * header, and its footer lands at or below the fold. Bookings has no such head — its title
 * lives INSIDE the main pane — which is why its inspector runs from the shell header to the
 * viewport bottom.
 *
 * `InflowPageHost` lets such a shell offer its head to whatever workspace it contains. A
 * workspace inside it CLAIMS the head: it renders the head at the top of its own main pane
 * (above the panel's own `head`, e.g. tabs) while the panes are side by side, and above the
 * grid when they stack. The shell stops rendering the head and wears `is-inflow-host`, which
 * drops the `.pd-main` gutter and the `.pd-page` max-width exactly like the Bookings page
 * (admin-extra.css), so the workspace starts at the shell header and the inspector gets the
 * Bookings geometry. Without a workspace (a disabled-module card, a settings form) nothing
 * claims the head and the shell renders it as before.
 *
 * `head` is the node to host; `onHostedChange( hosted )` tells the shell whether a workspace
 * currently holds it.
 *
 * ONE CONTEXT OBJECT FOR EVERY BUNDLE. The host is the SPA's route (admin entry) and the
 * workspace usually a module panel (`assets/src/pro/{code}` entry), which webpack compiles its
 * own copy of this file into — with its own `createContext()` result, which a provider from the
 * admin copy would never reach (the same trap `lib/toast.jsx` documents). Both copies therefore
 * take the context from the shared `window.apontoAdmin` namespace; whichever copy evaluates
 * first creates it. React itself is the WordPress-provided external, so one context object is
 * all the two copies need to meet.
 */
function sharedHostContext() {
	const scope = typeof window !== 'undefined' ? window : globalThis;
	if ( ! scope ) {
		return createContext( null );
	}
	if ( ! scope.apontoAdmin || typeof scope.apontoAdmin !== 'object' ) {
		scope.apontoAdmin = {};
	}
	if ( ! scope.apontoAdmin.inflowHostContext ) {
		scope.apontoAdmin.inflowHostContext = createContext( null );
	}
	return scope.apontoAdmin.inflowHostContext;
}

const InflowHostContext = sharedHostContext();

export function InflowPageHost( { head, onHostedChange, children } ) {
	const [ claims, setClaims ] = useState( 0 );
	const claim = useCallback( () => {
		setClaims( ( count ) => count + 1 );
		return () => setClaims( ( count ) => count - 1 );
	}, [] );
	const hosted = claims > 0;
	useLayoutEffect( () => {
		onHostedChange?.( hosted );
	}, [ hosted, onHostedChange ] );
	const value = useMemo( () => ( { head, hosted, claim } ), [ head, hosted, claim ] );
	return <InflowHostContext.Provider value={ value }>{ children }</InflowHostContext.Provider>;
}

export function InflowWorkspace( {
	widthKey,
	open,
	label = 'Inspector',
	inspectorLabelledBy,
	children,
	inspector,
	fitViewport = false,
	flushMain = false,
	head = null,
} ) {
	const { width, maxWidth, stacked, resizing, workspaceRef, startResize, keyResize } = useInspectorWidth( widthKey );

	// Claim a surrounding page shell's head (see `InflowPageHost`). The claim is made in a
	// layout effect, so the head moves into this workspace before the first paint.
	const host = useContext( InflowHostContext );
	const hostClaim = host?.claim;
	useLayoutEffect( () => ( hostClaim ? hostClaim() : undefined ), [ hostClaim ] );
	const hosted = Boolean( host?.hosted );
	const pageHead = hosted ? host.head : null;
	// A hosted workspace owns the page gutter again (the shell dropped `.pd-main`'s), so a
	// panel's `flushMain` only applies to an unhosted placement.
	const flush = flushMain && ! hosted;

	// Side by side, a HOSTED workspace starts directly under the shell header — the Bookings
	// position — so the stylesheet's own inspector height (the Bookings geometry) is right and
	// nothing is measured. Measuring is for an inspector that does not start there: an
	// unhosted `fitViewport` placement below other page content, and every STACKED hosted
	// workspace, whose inspector row follows the page head and its tabs.
	const fit = stacked ? fitViewport || hosted : fitViewport && ! hosted;

	const inspectorRef = useRef( null );
	const [ viewportHeight, setViewportHeight ] = useState( null );
	// Module settings may begin much lower than the normal route header. Measure the
	// actual sticky inspector position instead of assuming the global 144px offset.
	const measureHeight = () => {
		if ( ! fit || ! open || ! inspectorRef.current ) return;
		const visual = window.visualViewport;
		const viewportTop = visual?.offsetTop || 0;
		const viewportBottom = viewportTop + ( visual?.height || window.innerHeight );
		const top = Math.max( viewportTop, inspectorRef.current.getBoundingClientRect().top );
		const height = Math.max( stacked ? 320 : 1, Math.floor( viewportBottom - top ) );
		setViewportHeight( ( previous ) => previous === height ? previous : height );
	};
	// Every React layout commit can move the module (notices, header changes, tab changes).
	useLayoutEffect( measureHeight );
	useLayoutEffect( () => {
		if ( ! fit || ! open ) return undefined;
		window.addEventListener( 'resize', measureHeight );
		window.addEventListener( 'scroll', measureHeight, true );
		window.visualViewport?.addEventListener( 'resize', measureHeight );
		window.visualViewport?.addEventListener( 'scroll', measureHeight );
		const observer = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver( measureHeight ) : null;
		// Ancestors cover shell/module-page layout changes without a window resize.
		let node = workspaceRef.current;
		while ( node ) { observer?.observe( node ); node = node.parentElement; }
		return () => {
			window.removeEventListener( 'resize', measureHeight );
			window.removeEventListener( 'scroll', measureHeight, true );
			window.visualViewport?.removeEventListener( 'resize', measureHeight );
			window.visualViewport?.removeEventListener( 'scroll', measureHeight );
			observer?.disconnect();
		};
	}, [ fit, open, stacked ] );

	// `head` (a module's tabs) sits at the top of the MAIN pane beside a full-height inspector
	// while the panes are side by side. Once the workspace STACKS (≤840px container), the
	// inspector is row 1, so a head inside the main pane would be pushed a whole
	// inspector-height down (webhooks W-UI-12).
	// Stacked, it is rendered ABOVE the grid instead: head → inspector → list. The wrapper reuses
	// the main pane's own padding (none under `flushMain`, so the head stays aligned with a module
	// page's breadcrumb); only its bottom is dropped, the inspector row follows at once.
	// A hosted page head (breadcrumb, subnav) always leads, before the panel's own head.
	const mainHead = pageHead || head ? <>{ pageHead }{ head }</> : null;
	const headAbove = mainHead && stacked;

	return (
		<div className={ `pd-page pd-inflow-page${ hosted ? ' is-page-host' : '' }` }>
			{ headAbove ? <div className="pd-bookings-main pd-inflow-head" style={ flush ? { padding: 0 } : { paddingBottom: 0 } }>{ mainHead }</div> : null }
			<div
				ref={ workspaceRef }
				className={ `pd-bookings-workspace${ open ? ' is-inspecting' : '' }${ resizing ? ' is-resizing' : '' }` }
				style={ { '--pd-booking-inspector-width': `${ width }px`, ...( fit && viewportHeight !== null ? { '--pd-booking-inspector-height': `${ viewportHeight }px` } : {} ) } }
			>
				<div className="pd-bookings-main" style={ flush ? { padding: 0, ...( open && ! stacked ? { paddingInlineEnd: 'var(--pd-content-gutter)' } : {} ) } : undefined }>{ mainHead && ! headAbove ? mainHead : null }{ children }</div>
				{ /* Stacked below the breakpoint: the panes are rows, not columns, so there is no
				     width to drag. SPEC.md says resizing is disabled there, and the stylesheet
				     already drops the cursor and the px readout — this drops the handlers and the
				     tab stop with them, so the separator stops advertising a control that does
				     nothing. */ }
				<div
					className="pd-inflow-resizer"
					role="separator"
					aria-orientation={ stacked ? 'horizontal' : 'vertical' }
					aria-label={ `Resize ${ label.toLowerCase() }` }
					aria-valuemin={ stacked ? undefined : MIN_W }
					aria-valuemax={ stacked ? undefined : maxWidth }
					aria-valuenow={ stacked ? undefined : width }
					aria-disabled={ stacked ? true : undefined }
					tabIndex={ open && ! stacked ? 0 : -1 }
					hidden={ ! open }
					onPointerDown={ stacked ? undefined : startResize }
					onKeyDown={ stacked ? undefined : keyResize }
				>
					<span aria-hidden="true">{ width }px</span>
				</div>
				<aside
					ref={ inspectorRef }
					className="pd-booking-inspector"
					aria-label={ inspectorLabelledBy ? undefined : label }
					aria-labelledby={ inspectorLabelledBy }
					hidden={ ! open }
				>
					{ open ? inspector : null }
				</aside>
			</div>
		</div>
	);
}

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
import { MIN_W, useInspectorWidth } from './inspector-width.js';

export function InflowWorkspace( {
	widthKey,
	open,
	label = 'Inspector',
	inspectorLabelledBy,
	children,
	inspector,
} ) {
	const { width, maxWidth, stacked, resizing, workspaceRef, startResize, keyResize } = useInspectorWidth( widthKey );

	return (
		<div className="pd-page pd-inflow-page">
			<div
				ref={ workspaceRef }
				className={ `pd-bookings-workspace${ open ? ' is-inspecting' : '' }${ resizing ? ' is-resizing' : '' }` }
				style={ { '--pd-booking-inspector-width': `${ width }px` } }
			>
				<div className="pd-bookings-main">{ children }</div>
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

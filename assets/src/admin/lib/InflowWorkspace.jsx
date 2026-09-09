/**
 * Shared in-flow inspector workspace (mockup §6.7). A two-column push layout:
 * the list stays interactive (no backdrop / body-lock / focus-trap / inert) while
 * an inspector or quick-view opens beside it, with a keyboard + pointer resizer
 * and a per-route persisted width. Extracted from the Bookings route so Customers,
 * Services (quick view) and module-owned inspectors share one shell; it reuses the
 * existing `.pd-bookings-workspace` / `.pd-booking-inspector` / `.pd-inflow-resizer`
 * chrome (the mockup's shared inspector), so module-owned inspectors can reuse it without
 * reintroducing a standalone core route or authoring new table/shell CSS.
 */
import { useState, useRef } from 'react';

const MIN_W = 320;
const MAX_W = 520;
const DEFAULT_W = 380;
const clampW = ( w ) => Math.round( Math.min( MAX_W, Math.max( MIN_W, Number( w ) || DEFAULT_W ) ) );

export function InflowWorkspace( {
	widthKey,
	open,
	label = 'Inspector',
	inspectorLabelledBy,
	children,
	inspector,
} ) {
	const [ width, setWidth ] = useState( () => {
		try {
			return clampW( window.localStorage.getItem( widthKey ) );
		} catch ( e ) {
			return DEFAULT_W;
		}
	} );
	const [ resizing, setResizing ] = useState( false );
	const widthRef = useRef( width );
	widthRef.current = width;

	const startResize = ( e ) => {
		if ( e.button !== 0 ) {
			return;
		}
		e.preventDefault();
		const startX = e.clientX;
		const startW = widthRef.current;
		setResizing( true );
		const move = ( me ) => setWidth( clampW( startW + ( startX - me.clientX ) ) );
		const up = () => {
			window.removeEventListener( 'pointermove', move );
			window.removeEventListener( 'pointerup', up );
			setResizing( false );
			try {
				window.localStorage.setItem( widthKey, String( widthRef.current ) );
			} catch ( err ) { /* ignore */ }
		};
		window.addEventListener( 'pointermove', move );
		window.addEventListener( 'pointerup', up );
	};

	const keyResize = ( e ) => {
		let next = width;
		if ( e.key === 'ArrowLeft' ) next = width + 16;
		else if ( e.key === 'ArrowRight' ) next = width - 16;
		else if ( e.key === 'Home' ) next = DEFAULT_W;
		else if ( e.key === 'End' ) next = MAX_W;
		else return;
		e.preventDefault();
		next = clampW( next );
		setWidth( next );
		try {
			window.localStorage.setItem( widthKey, String( next ) );
		} catch ( err ) { /* ignore */ }
	};

	return (
		<div className="pd-page">
			<div
				className={ `pd-bookings-workspace${ open ? ' is-inspecting' : '' }${ resizing ? ' is-resizing' : '' }` }
				style={ { '--pd-booking-inspector-width': `${ width }px` } }
			>
				<div className="pd-bookings-main">{ children }</div>
				<div
					className="pd-inflow-resizer"
					role="separator"
					aria-orientation="vertical"
					aria-label={ `Resize ${ label.toLowerCase() }` }
					aria-valuemin={ MIN_W }
					aria-valuemax={ MAX_W }
					aria-valuenow={ width }
					tabIndex={ open ? 0 : -1 }
					hidden={ ! open }
					onPointerDown={ startResize }
					onKeyDown={ keyResize }
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

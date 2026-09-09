/**
 * Small shared route chrome: page header + loading/error/empty state surfaces
 * (SPEC-P1 §1.0 "mọi list có empty-state"; mockup §12 state contract).
 */
import { renderIcon } from './icon.jsx';

/**
 * Scroll behavior that honors `prefers-reduced-motion`: smooth by default,
 * instant when the user asked for reduced motion (record-editor section navs).
 */
export function motionScrollBehavior() {
	return window.matchMedia?.( '(prefers-reduced-motion: reduce)' ).matches ? 'auto' : 'smooth';
}

/**
 * Roving focus for `role="menu"` containers (SPEC §11 "Menus implement Arrow Up/Down
 * and Escape"). Arrow keys wrap around the ends; Home/End jump to the edges. Escape is
 * owned by the menu's host, which also restores focus to the trigger.
 */
export function menuRovingKeydown( event ) {
	if ( ! [ 'ArrowDown', 'ArrowUp', 'Home', 'End' ].includes( event.key ) ) {
		return;
	}
	const items = [ ...event.currentTarget.querySelectorAll( '[role="menuitem"],[role="menuitemradio"]' ) ]
		.filter( ( item ) => ! item.disabled );
	if ( ! items.length ) {
		return;
	}
	event.preventDefault();
	const index = items.indexOf( document.activeElement );
	const last = items.length - 1;
	const target = event.key === 'Home' ? items[ 0 ]
		: event.key === 'End' ? items[ last ]
		: event.key === 'ArrowDown' ? items[ index >= last ? 0 : index + 1 ]
		: items[ index <= 0 ? last : index - 1 ];
	target?.focus();
}

/**
 * The route title block: `h1` plus the one-line route description.
 *
 * The description carries `.pd-page-description` — the SAME class the module panel head
 * uses (`modules/ModuleSettingsRoute.jsx`), so the two surfaces share one typography rule
 * (plugin-dashboard.css) instead of drifting apart (founder, 2026-09-04).
 */
export function PageHeader( { title, description, actions } ) {
	return (
		<header className="pd-page-header">
			<div>
				<h1>{ title }</h1>
				{ description ? <p className="pd-page-description">{ description }</p> : null }
			</div>
			{ actions ? <div className="pd-page-actions">{ actions }</div> : null }
		</header>
	);
}

export function RouteLoading( { label = 'Loading…' } ) {
	return (
		<section className="ap-route-state" aria-busy="true" aria-label={ label }>
			<span className="ap-skeleton" style={ { width: '220px', height: '18px' } } />
			<span className="ap-skeleton" style={ { width: '320px', height: '14px' } } />
			<span className="ap-skeleton" style={ { width: '80%', height: '120px', marginTop: '12px' } } />
		</section>
	);
}

export function RouteError( { message, onRetry } ) {
	return (
		<section className="ap-route-state">
			<span className="ap-state-icon is-error">{ renderIcon( 'alert' ) }</span>
			<h2>Something went wrong</h2>
			<p>{ message || 'The request failed. Please try again.' }</p>
			{ onRetry ? <button className="pd-button" type="button" onClick={ onRetry }>{ renderIcon( 'arrows' ) }Retry</button> : null }
		</section>
	);
}

export function RouteEmpty( { icon = 'calendar', title, description, action } ) {
	return (
		<section className="ap-route-state">
			<span className="ap-state-icon">{ renderIcon( icon ) }</span>
			<h2>{ title }</h2>
			{ description ? <p>{ description }</p> : null }
			{ action || null }
		</section>
	);
}

/**
 * Footer overflow `…` menu for a record drawer — the Booking editor's pattern, made reusable.
 *
 * A thin binding over the kit's headless `createMenu` (the same primitive as RowMenu): the kit
 * owns the keyboard contract (Arrow roving, Home/End, Escape-close with focus returned to the
 * trigger, outside-pointerdown dismiss, aria wiring), so none of that is re-implemented here.
 * Secondary and destructive record actions live HERE, beside the footer's primary button, not as
 * a loose button row in the drawer body (founder, 2026-09-29).
 */
import { useEffect, useRef } from '@wordpress/element';
import { createMenu } from '@pressmaximum/dashboard-kit/primitives';

/**
 * @param {Object}   props
 * @param {Array}    props.items      `{ action, label, icon?, disabled?, danger?, separatorBefore? }`.
 * @param {string}   props.label      Accessible name of the trigger and the menu.
 * @param {Function} props.renderIcon Icon renderer from `lib/icon.jsx`.
 * @param {Function} props.onSelect   Receives the chosen item's `action`.
 */
export function InspectorMoreMenu( { items, label, renderIcon, onSelect } ) {
	const rootRef = useRef( null );
	const handlerRef = useRef( onSelect );
	handlerRef.current = onSelect;

	useEffect( () => {
		if ( ! rootRef.current ) {
			return undefined;
		}
		const controller = createMenu( rootRef.current, {
			onSelect: ( item ) => {
				const action = item.getAttribute( 'data-action' );
				if ( action ) {
					handlerRef.current?.( action );
				}
			},
		} );
		return () => controller.destroy();
	}, [] );

	return (
		<div className="pd-inspector-more-menu" ref={ rootRef }>
			<button
				className="pd-button sm icon-only"
				type="button"
				data-menu-trigger
				aria-haspopup="menu"
				aria-expanded="false"
				aria-label={ label }
				title={ label }
			>
				{ renderIcon( 'more' ) }
			</button>
			<div role="menu" aria-label={ label } hidden>
				{ items.flatMap( ( item ) => {
					const nodes = [];
					if ( item.separatorBefore ) {
						nodes.push( <div className="pmdk-row-action-separator" role="separator" key={ `${ item.action }-sep` } /> );
					}
					nodes.push(
						<button
							key={ item.action }
							type="button"
							role="menuitem"
							data-action={ item.action }
							className={ item.danger ? 'is-danger' : undefined }
							disabled={ item.disabled }
						>
							{ item.icon ? renderIcon( item.icon ) : null }
							{ item.label }
						</button>
					);
					return nodes;
				} ) }
			</div>
		</div>
	);
}

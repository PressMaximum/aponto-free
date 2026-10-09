/**
 * Row-action kebab menu — a thin React binding over the kit's headless
 * `createMenu` primitive (KIT-P3 slice 3). The kit owns all popover behavior
 * (trigger toggle + aria-expanded, keyboard-open focus, roving menu keys,
 * Escape-with-focus-return, outside-pointerdown dismiss, viewport-clamped
 * floating position) on its `.pmdk-row-action*` chrome; the product supplies the
 * item list + handlers. This is the B4b consumer of `createMenu` (the same
 * behavior BookingsTable hand-rolls, now shared).
 *
 * items: [{ action, label, hint?, icon?, danger?, disabled?, separatorBefore? }]
 *
 * `disabled` (D-R56 fix round 2) renders a natively disabled `<button role="menuitem">`: it fires
 * no click, so the kit's `onSelect` cannot reach a handler, and assistive tech is told the same
 * thing the pointer is. Used while a row-scoped mutation is in flight, so a second Archive cannot
 * be issued on top of the first.
 */
import { useEffect, useRef } from 'react';
import { createMenu } from '@pressmaximum/dashboard-kit/primitives';

export function RowMenu( { items, label, renderIcon, onSelect } ) {
	const rootRef = useRef( null );
	const handlerRef = useRef( onSelect );
	handlerRef.current = onSelect;

	useEffect( () => {
		if ( ! rootRef.current ) {
			return undefined;
		}
		const controller = createMenu( rootRef.current, {
			position: 'fixed',
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
		<div className="pmdk-row-actions" ref={ rootRef }>
			<button
				className="pmdk-row-action pmdk-row-action-icon"
				type="button"
				data-menu-trigger
				aria-haspopup="menu"
				aria-expanded="false"
				aria-label={ label }
			>
				{ renderIcon( 'moreVertical' ) }
			</button>
			<div className="pmdk-row-action-menu" role="menu" aria-label={ label } hidden>
				{ items.flatMap( ( item ) => {
					const nodes = [];
					if ( item.separatorBefore ) {
						nodes.push( <div className="pmdk-row-action-separator" role="separator" key={ `${ item.action }-sep` } /> );
					}
					nodes.push(
						<button
							className={ item.danger ? 'is-danger' : undefined }
							type="button"
							role="menuitem"
							data-action={ item.action }
							disabled={ item.disabled || undefined }
							aria-disabled={ item.disabled ? 'true' : undefined }
							key={ item.action }
						>
							{ item.icon ? renderIcon( item.icon ) : null }
							<span>{ item.label }{ item.hint ? <small>{ item.hint }</small> : null }</span>
						</button>
					);
					return nodes;
				} ) }
			</div>
		</div>
	);
}

/**
 * Drag-reorder services within one selected category (SPEC-P1 §1.1). Only reachable
 * when exactly one category is filtered; `/services/reorder` is a full-set
 * replacement (rest-contract §2.3), so on save the new intra-category order is
 * spliced back into the global position order and the complete id list is posted.
 * dnd-kit sortable list (accessible: pointer + keyboard).
 *
 * The category arrives as the facet IDENTITY (`id:<id>` — lib/facet-options.js), never as
 * its display name: membership decided by name would splice two same-named categories
 * into one order and post a wrong full-set list.
 */
import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../lib/api.js';
import { renderIcon } from '../lib/icon.jsx';
import { facetIdentity } from '../lib/facet-options.js';

function SortableRow( { service } ) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: service.id } );
	return (
		<li
			ref={ setNodeRef }
			className={ `ap-reorder-row${ isDragging ? ' is-dragging' : '' }` }
			style={ { transform: CSS.Transform.toString( transform ), transition } }
		>
			<button className="ap-reorder-handle" type="button" aria-label={ `Drag ${ service.name }` } { ...attributes } { ...listeners }>{ renderIcon( 'moreVertical' ) }</button>
			<span className="ap-reorder-name">{ service.name }</span>
			<span className="ap-status-pill is-small">{ service.duration_minutes } min</span>
		</li>
	);
}

export function ServiceReorder( { categoryIdentity, services, onCancel, onSaved, showToast } ) {
	const byPosition = ( a, b ) => ( a.position - b.position ) || ( a.id - b.id );
	const inCategory = ( service ) => facetIdentity( service, 'categoryId', 'categoryName' ) === categoryIdentity;
	const categoryLabel = services.find( inCategory )?.categoryName || '';
	const [ order, setOrder ] = useState( () => services.filter( inCategory ).sort( byPosition ).map( ( s ) => s.id ) );
	const [ saving, setSaving ] = useState( false );
	const sensors = useSensors(
		useSensor( PointerSensor, { activationConstraint: { distance: 5 } } ),
		useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } )
	);
	const nameById = Object.fromEntries( services.map( ( s ) => [ s.id, s ] ) );

	const onDragEnd = ( { active, over } ) => {
		if ( ! over || active.id === over.id ) {
			return;
		}
		setOrder( ( ids ) => arrayMove( ids, ids.indexOf( active.id ), ids.indexOf( over.id ) ) );
	};

	const save = async () => {
		setSaving( true );
		// Splice the new intra-category order back into the global position order.
		const global = [ ...services ].sort( byPosition );
		let cursor = 0;
		const fullIds = global.map( ( s ) => ( inCategory( s ) ? order[ cursor++ ] : s.id ) );
		try {
			await api.post( '/services/reorder', { ids: fullIds } );
			showToast( 'Service order saved.', 'success' );
			onSaved?.();
		} catch ( err ) {
			showToast( err.message, 'danger' );
			setSaving( false );
		}
	};

	return (
		<div className="ap-reorder">
			<div className="ap-reorder-head">
				<div><strong>Reorder “{ categoryLabel }”</strong><span>Drag to set the order customers see.</span></div>
				<div className="ap-reorder-actions">
					<button className="pd-button sm" type="button" onClick={ onCancel }>Cancel</button>
					<button className="pd-button primary sm" type="button" disabled={ saving } onClick={ save }>{ saving ? 'Saving…' : 'Save order' }</button>
				</div>
			</div>
			<DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ onDragEnd }>
				<SortableContext items={ order } strategy={ verticalListSortingStrategy }>
					<ul className="ap-reorder-list">
						{ order.map( ( id ) => <SortableRow key={ id } service={ nameById[ id ] } /> ) }
					</ul>
				</SortableContext>
			</DndContext>
		</div>
	);
}

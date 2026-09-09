/**
 * Thin, framework-agnostic adapter around Event Calendar v5 (ported from
 * spikes/ec-look/src/ec-adapter.js — Q10 criterion f). All "does an option change
 * re-create the instance?" risk lives here: create once, update = setOption only
 * for changed keys, destroy = awaited destroyCalendar. Pin @event-calendar/core
 * 5.x (docs/research/spike-ec-look-results.md).
 */
import { createCalendar, destroyCalendar, TimeGrid, Interaction } from '@event-calendar/core';

const PLUGINS = [ TimeGrid, Interaction ];

export function createAdapter( el, initialOptions ) {
	let options = { ...initialOptions };
	const instance = createCalendar( el, PLUGINS, options );

	const handle = {
		el,
		instance,
		update( next ) {
			for ( const key of Object.keys( next ) ) {
				if ( ! Object.is( options[ key ], next[ key ] ) ) {
					instance.setOption( key, next[ key ] );
				}
			}
			options = { ...options, ...next };
			return handle;
		},
		getView() {
			return instance.getView();
		},
		next() { instance.next(); return handle; },
		prev() { instance.prev(); return handle; },
		gotoDate( date ) { instance.gotoDate( date ); options.date = date; return handle; },
		setView( view ) { return handle.update( { view } ); },
		unselect() { instance.unselect?.(); },
		async destroy() { await destroyCalendar( instance ); },
	};

	return handle;
}

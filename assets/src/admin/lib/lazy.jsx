/**
 * Lazily loaded admin surfaces (webpack code splitting).
 *
 * The admin SPA has a ~150 KB gz soft cap (AGENTS §6) and the payment surfaces pushed
 * `admin.js` over it. The rarely used, self-contained screens therefore load as separate
 * chunks emitted next to `admin.js` in `assets/dist/{edition}/`. NOTHING on the first-paint
 * path is wrapped in here: Dashboard, Bookings (list) and Calendar stay in the entry bundle,
 * because a spinner on the screen the operator opens all day is not a saving.
 *
 * Two guarantees this helper exists to provide:
 *
 *   1. A LOADING state, never a blank frame — the wp-components `Spinner`, the same one the
 *      rest of the admin uses, inside a polite live region.
 *   2. A RECOVERABLE error state, never a white screen. A chunk request can fail for reasons
 *      that have nothing to do with the app (an offline moment, a proxy, a half-deployed
 *      plugin directory), and all of those are worth ONE more try. `React.lazy` caches its
 *      factory's rejection for the life of the component, so "retry" has to build a NEW lazy
 *      component rather than call the same one again — hence the `attempt` counter below.
 *
 * Chunk NAMES are set by `webpackChunkName` magic comments at the call sites so the emitted
 * files are stable, greppable (`admin-chunk-*.js`) and easy to assert on when packaging
 * (`build/scripts/build-dist.mjs`). Cache-busting is webpack's own `?ver=[chunkhash]` query
 * on `output.chunkFilename`, and `output.clean` removes stale chunks on every build.
 */
import { Component, Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/** Placeholder while the chunk is in flight. */
function SurfaceLoading( { label } ) {
	return (
		<div className="ap-lazy-state" role="status" aria-live="polite">
			<Spinner />
			<span>{ label || __( 'Loading…', 'aponto' ) }</span>
		</div>
	);
}

/** Recovery line for a chunk that did not arrive. */
function SurfaceError( { onRetry } ) {
	return (
		<div className="ap-lazy-state is-error" role="alert">
			<p>{ __( 'This part of the dashboard could not be loaded.', 'aponto' ) }</p>
			<button className="pd-button" type="button" onClick={ onRetry }>
				{ __( 'Try again', 'aponto' ) }
			</button>
		</div>
	);
}

/**
 * Error boundary around one lazy surface.
 *
 * Resets on a NEW `attempt` (derived from props, so the recovery render is the very next one
 * rather than a flash of the error state after a `componentDidUpdate`).
 */
class ChunkBoundary extends Component {
	constructor( props ) {
		super( props );
		this.state = { failed: false, attempt: props.attempt };
	}

	static getDerivedStateFromError() {
		return { failed: true };
	}

	static getDerivedStateFromProps( props, state ) {
		return props.attempt === state.attempt ? null : { failed: false, attempt: props.attempt };
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}

/**
 * Wrap a dynamic `import()` as a route/panel component.
 *
 * @param {Function} importer  `() => import( /* webpackChunkName: "…" *\/ '…' )`.
 * @param {Object}   options   Surface options.
 * @param {string}   [options.pick]  Named export to render (default: the module's default).
 * @param {string}   [options.label] Loading label, announced to assistive tech.
 * @return {Function} Component that renders the surface, with loading + retry states.
 */
export function lazySurface( importer, { pick = 'default', label = '' } = {} ) {
	const load = () => importer().then( ( module ) => ( { default: module[ pick ] } ) );

	function LazySurface( props ) {
		const [ attempt, setAttempt ] = useState( 0 );
		const retry = useCallback( () => setAttempt( ( n ) => n + 1 ), [] );
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is a module constant;
		// the attempt counter is the whole point (see the class docblock).
		const Lazy = useMemo( () => lazy( load ), [ attempt ] );

		return (
			<ChunkBoundary attempt={ attempt } fallback={ <SurfaceError onRetry={ retry } /> }>
				<Suspense fallback={ <SurfaceLoading label={ label } /> }>
					<Lazy { ...props } />
				</Suspense>
			</ChunkBoundary>
		);
	}

	LazySurface.displayName = `LazySurface(${ pick })`;

	return LazySurface;
}

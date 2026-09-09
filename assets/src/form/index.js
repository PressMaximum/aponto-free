/**
 * Frontend (view) entry for the Aponto booking form widget.
 *
 * Webpack builds this as the `form` bundle with Preact BUNDLED (the per-file
 * `@jsxImportSource preact` pragma in the JSX modules; DependencyExtraction does
 * not externalize `preact`), so no React runtime ships to the public widget. It
 * scans the page for `[data-aponto-form]` host containers (emitted by the block
 * render_callback in B2, or the dev harness in B1) and mounts the widget into an
 * open ShadowRoot on each.
 */
import { mountWidget } from './mount.jsx';

function boot() {
	document
		.querySelectorAll( '[data-aponto-form]' )
		.forEach( ( el ) => mountWidget( el ) );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', boot );
} else {
	boot();
}

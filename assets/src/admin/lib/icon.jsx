/**
 * React icon renderer. Wraps the shared Phosphor icon family (icons.js) the same
 * way the mockup entry does, so `.pd-*` chrome + BookingsTable receive a
 * `renderIcon( name )` that returns a React element.
 */
import { apontoIcon } from '../icons.js';

export function renderIcon( name, className = '' ) {
	return (
		<span
			className={ `pd-react-icon${ className ? ` ${ className }` : '' }` }
			aria-hidden="true"
			dangerouslySetInnerHTML={ { __html: apontoIcon( name, '', 'regular' ) } }
		/>
	);
}

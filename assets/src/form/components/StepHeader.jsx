/** @jsxImportSource preact */
/**
 * Step heading with the compact fraction progress (SPEC-P1 §2.1). Progress is a
 * fraction next to the heading — never a bar — and carries an accessible
 * "Step X of N" label that renumbers honestly as dynamic steps appear/disappear.
 * The heading is focused on mount ONLY after a user-driven step change
 * (`focusOnMount`), so keyboard/AT users land on the new step after navigation
 * without the widget stealing focus / scrolling the page on its first paint
 * (REVIEW §2 #17).
 */
import { useRef, useEffect } from 'preact/hooks';
import { COPY, sprintf } from '../lib/copy.js';

function pad2( n ) {
	return n < 10 ? '0' + n : '' + n;
}

export function StepHeader( {
	title,
	sub,
	stepIndex,
	stepCount,
	focusOnMount = true,
} ) {
	const headingRef = useRef( null );

	useEffect( () => {
		if ( focusOnMount && headingRef.current ) {
			headingRef.current.focus();
		}
		// Mount-only: reads focusOnMount at mount time (correct for the fresh
		// heading of the step just navigated to).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	const showFraction =
		Number.isInteger( stepIndex ) && Number.isInteger( stepCount );

	return (
		<div class="ap-h">
			<h2 ref={ headingRef } tabIndex={ -1 }>
				{ title }
			</h2>
			{ showFraction && (
				<span
					class="ap-step-fraction"
					aria-label={ sprintf(
						COPY.step_of,
						stepIndex,
						stepCount
					) }
				>
					{ pad2( stepIndex ) } / { pad2( stepCount ) }
				</span>
			) }
			{ sub ? <p class="sub">{ sub }</p> : null }
		</div>
	);
}

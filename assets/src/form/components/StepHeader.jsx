/** @jsxImportSource preact */
/**
 * Step heading plus progress (SPEC-P1 §2.1; two displays since D-R53).
 *
 * **Fraction** — the compact `01 / 05` beside the heading, never a bar. Shipped since P1 and
 * still the DEFAULT, so every already-published block renders exactly as it did.
 *
 * **Horizontal** — the v4 mockup's macro progress (`docs/mockups/v4/booking-form/index.html`,
 * `compactProgressHTML`): a numbered rail above the heading, one item per step, with
 * done / current / upcoming states. Chosen per block in the inspector's Appearance panel.
 *
 * Both are driven by the SAME derived step list the fraction's denominator comes from, so the
 * rail is as honest as the number: the Staff step and the Payment step appear only when this
 * booking really has them, and a preselected service drops the Service step from both.
 *
 * Done steps are deliberately NOT clickable, unlike the mockup's: jumping back in the shipped
 * flow releases a payment hold and can cross a live payment state, so "safe back-navigation"
 * is a decision with its own rules — the Back button already owns them. The rail reports
 * progress; it does not navigate.
 *
 * The heading is focused on mount ONLY after a user-driven step change (`focusOnMount`), so
 * keyboard/AT users land on the new step after navigation without the widget stealing focus or
 * scrolling the page on its first paint (REVIEW §2 #17).
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
	progress = null,
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

	const numbered =
		Number.isInteger( stepIndex ) && Number.isInteger( stepCount );
	const horizontal = numbered && railApplies( progress );

	return (
		<>
			<StepRail
				progress={ progress }
				stepIndex={ stepIndex }
				stepCount={ stepCount }
			/>
			<div class="ap-h">
				<h2 ref={ headingRef } tabIndex={ -1 }>
					{ title }
				</h2>
				{ numbered && ! horizontal && (
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
		</>
	);
}

/** Whether this block asked for the rail AND there is more than one step to draw. */
function railApplies( progress ) {
	return !! (
		progress &&
		'horizontal' === progress.display &&
		( progress.steps || [] ).length > 1
	);
}

/**
 * The macro progress rail, plus the hidden "Step N of M" that replaces the visible fraction in
 * this mode — one announcement, not two.
 *
 * Exported because the CONFIRMATION screen has no `StepHeader` (it is an outcome panel with its
 * own heading block) and yet IS the last item in the step list: without this the rail simply
 * vanished on the final screen and its last item never became current (fix round 1, P2-2).
 *
 * Renders nothing at all in fraction mode, so the confirmation panel is byte-identical to what
 * it has always been for every block that did not opt in.
 *
 * @param {Object}   props           Props.
 * @param {?Object}  props.progress  `{display, steps}` from the resolved config, or null.
 * @param {number}   props.stepIndex 1-based position of the CURRENT step.
 * @param {number}   props.stepCount Total steps in this booking.
 * @return {?Object} Rail.
 */
export function StepRail( { progress, stepIndex, stepCount } ) {
	if (
		! railApplies( progress ) ||
		! Number.isInteger( stepIndex ) ||
		! Number.isInteger( stepCount )
	) {
		return null;
	}

	return (
		<>
			<ol class="ap-steps" aria-label={ COPY.progress_label }>
				{ progress.steps.map( ( label, i ) => (
					<li
						key={ label + ':' + i }
						class={
							i + 1 < stepIndex
								? 'is-done' + ( progress.onJump ? ' is-link' : '' )
								: ''
						}
						// The ONLY per-item state assistive tech needs: "you are
						// here". Done/upcoming are conveyed by the label order and
						// by the hidden count below, so a second announcement per
						// item would be noise.
						aria-current={ i + 1 === stepIndex ? 'step' : undefined }
						// The full label stays in the accessible name even where
						// CSS ellipsises the visible text (fix round 1, P2-4).
						title={ label }
					>
						{ /* A done step is a real button when the app allows jumping
						   back (founder review 2026-09-30); upcoming and current steps
						   stay plain text. */ }
						{ i + 1 < stepIndex && progress.onJump ? (
							<button
								type="button"
								class="ap-step-btn"
								onClick={ () => progress.onJump( i ) }
							>
								<span class="ap-step-num" aria-hidden="true">
									{ i + 1 }
								</span>
								<span class="ap-step-label">{ label }</span>
							</button>
						) : (
							<>
								<span class="ap-step-num" aria-hidden="true">
									{ i + 1 }
								</span>
								<span class="ap-step-label">{ label }</span>
							</>
						) }
					</li>
				) ) }
			</ol>
			<span class="ap-visually-hidden">
				{ sprintf( COPY.step_of, stepIndex, stepCount ) }
			</span>
		</>
	);
}

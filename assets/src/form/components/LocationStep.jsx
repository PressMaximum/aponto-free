/** @jsxImportSource preact */
/**
 * Location step (D-R62, under the D-R60 product rules) — a DEDICATED step between Service and
 * Staff, present only when the site publishes a location roster (`/public/services`
 * `locations[]`, rest-contract §3.1 addendum 2026-09-23), the block does not preset a location,
 * and the chosen service is offered at two or more of them.
 *
 * Ported from the v4 mockup's step-by-step presentation (`docs/mockups/v4/booking-form/`
 * `index.html`, `locationHTML()`): heading "Choose a location", rows of pin + name + address +
 * tick. Three things it deliberately does NOT have:
 *
 *  - **No "Any location" row** (D-R60 rule 3). Assigning a place to a customer is a surprise,
 *    not a convenience, so the step is a required answer — which is also why there is no
 *    Continue: a row SELECTS-AND-ADVANCES exactly like a Service or Staff row.
 *  - **No new component.** The rows are the Staff step's own `StaffRow` with the pin in the
 *    rounded-square mark slot the "Any available" sparkle uses, so this step adds no CSS and no
 *    second set of keyboard/a11y semantics: native buttons, `aria-pressed`, Enter/Space.
 *  - **No cards variant, no profile dialog, no map, no hours** — none of them are in the
 *    mockup, and each would be new design.
 */
import { IconPin } from './icons.jsx';
import { StepHeader } from './StepHeader.jsx';
import { Footer } from './Footer.jsx';
import { StaffRow } from './StaffStep.jsx';
import { COPY } from '../lib/copy.js';

/**
 * @param {Object}    props              Props.
 * @param {Array<{id:number,name:string,address:string}>} props.locations Eligible locations,
 *                                       in roster order (`name ASC, id ASC`).
 * @param {?number}   props.selectedId   Chosen location id, or undefined before the first pick.
 * @param {number}    props.stepIndex    1-based position in the honest step list.
 * @param {?Object}   props.progress     Macro rail (D-R53), or null in fraction mode.
 * @param {number}    props.stepCount    Total steps in this booking.
 * @param {boolean}   props.focusOnMount Whether to move focus to the heading.
 * @param {Function}  props.onSelect     Called with the chosen location id.
 * @param {?Function} props.onBack       Back to Service, or null when this is the first step.
 * @return {Object} Step.
 */
export function LocationStep( {
	locations,
	selectedId,
	stepIndex,
	progress,
	stepCount,
	focusOnMount,
	onSelect,
	onBack,
} ) {
	return (
		<div class="ap-step">
			<StepHeader
				title={ COPY.location_title }
				sub={ COPY.location_sub }
				stepIndex={ stepIndex }
				progress={ progress }
				stepCount={ stepCount }
				focusOnMount={ focusOnMount }
			/>
			<div
				class="ap-staff-list scroll"
				role="group"
				aria-label={ COPY.location_title }
			>
				{ locations.map( ( location ) => (
					<StaffRow
						key={ location.id }
						name={ location.name }
						// An empty address is a single-line row, never an empty second line.
						sub={ location.address }
						mark={ <IconPin /> }
						selected={ location.id === selectedId }
						onClick={ () => onSelect( location.id ) }
					/>
				) ) }
			</div>
			{ ( onBack || undefined !== selectedId ) && (
				<Footer
					onBack={ onBack }
					onPrimary={
						undefined !== selectedId ? () => onSelect( selectedId ) : null
					}
					primaryLabel={ COPY.continue }
				/>
			) }
		</div>
	);
}

/** @jsxImportSource preact */
/**
 * In-flow footer: a text Back link and one primary CTA per step (design decision
 * §5 "One primary per step; Back is a text link"). No separating border; actions
 * align to the content grid edges.
 *
 * `onPrimary` is optional for exactly one case: a payment gateway whose own
 * control is the CTA (PayPal's buttons open their popup from a click on PayPal's
 * iframe, which no button of ours can produce). The slot keeps its grid column
 * so Back stays where it was.
 *
 * `backDisabled` is for the other half of that case: while such a gateway has an
 * attempt in flight, leaving the step would release a hold the gateway may be
 * about to capture against, so Back is DISABLED rather than removed — a control
 * that vanishes and comes back reads as a broken page, and the visitor needs to
 * see that the way out is still there once the popup closes.
 */
import { IconChevronLeft } from './icons.jsx';
import { COPY } from '../lib/copy.js';

export function Footer( {
	onBack,
	onPrimary,
	primaryLabel,
	primaryDisabled = false,
	backDisabled = false,
	busy = false,
	busyLabel,
	backLabel = COPY.back,
} ) {
	return (
		<div class="ap-foot">
			{ onBack ? (
				<button
					type="button"
					class="ap-back"
					onClick={ onBack }
					disabled={ backDisabled }
				>
					<IconChevronLeft />
					{ backLabel }
				</button>
			) : (
				<span />
			) }
			{ onPrimary ? (
				<button
					type="button"
					class={ 'ap-primary' + ( busy ? ' busy' : '' ) }
					onClick={ onPrimary }
					disabled={ primaryDisabled || busy }
					aria-busy={ busy ? 'true' : 'false' }
				>
					{ busy && <span class="ap-spin" aria-hidden="true" /> }
					{ busy ? busyLabel || COPY.saving : primaryLabel }
				</button>
			) : (
				<span />
			) }
		</div>
	);
}

/**
 * Full-screen wizard page chrome (SPEC-P1 §4).
 *
 * The wizard used to render as a narrow column inside the ordinary `.wrap`, wedged next to the
 * admin menu. It now takes the whole screen (the admin menu, admin bar, footer and every other
 * plugin's notices are suppressed on this screen only — see `WizardPage.php`), and this module owns
 * the chrome that replaces them: a full-width header carrying the brand, the six-step progress
 * indicator and the leave action.
 *
 * NOTHING here changes the flow. The header's "Exit setup" is wired to the SAME skip handler the
 * Welcome step's "I'll do it myself" already used — which is the server-side `skip` action that
 * auto-creates the owner-staff before redirecting (C12). It is a second door onto one existing
 * exit, not a new one.
 *
 * Progress is an ordered list so assistive technology gets the real "step 2 of 6" structure; the
 * current item carries `aria-current="step"` and completed items carry a screen-reader "Completed"
 * so the check glyph (decorative) is never the only signal. Three widths, one DOM:
 *
 *   - ≥961px — marker + label for all six steps;
 *   - 601–960px — markers, and only the CURRENT step keeps a visible label (translated labels can
 *     be much longer than the English ones, so the row must not depend on six of them fitting);
 *   - ≤600px — the list is screen-reader-only and the header shows the "Step 2 of 6" counter plus
 *     a progress track instead.
 */
import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

/**
 * The six wizard steps, in order (SPEC-P1 §4). Same keys the app switches on.
 *
 * @type {string[]}
 */
export const STEPS = [
	'welcome',
	'business',
	'hours',
	'staff',
	'service',
	'done',
];

/**
 * Short progress labels for the six steps.
 *
 * Deliberately shorter than each step's own heading ("Confirm your business info") — the indicator
 * is a location cue, not a second title. Built on call rather than at module scope so the strings
 * resolve after `wp_set_script_translations()` has installed the locale data.
 *
 * @return {string[]} Labels in step order.
 */
export function stepLabels() {
	return [
		__( 'Welcome', 'aponto' ),
		__( 'Business', 'aponto' ),
		__( 'Hours', 'aponto' ),
		__( 'Staff', 'aponto' ),
		__( 'Service', 'aponto' ),
		__( 'Done', 'aponto' ),
	];
}

/**
 * Resolve every step's display state against the step being shown.
 *
 * Pure so the "which dot is filled" decision is unit-testable without a DOM: earlier steps read as
 * complete, the current one as current, later ones as upcoming. An out-of-range index is clamped
 * rather than producing a list with no current step.
 *
 * @param {number} index Zero-based index of the step on screen.
 * @return {Array<{key: string, label: string, state: string, position: number}>} Step descriptors.
 */
export function stepStates( index ) {
	const labels = stepLabels();
	const current = Math.min(
		Math.max( Number.isFinite( index ) ? index : 0, 0 ),
		STEPS.length - 1
	);

	return STEPS.map( ( key, i ) => ( {
		key,
		label: labels[ i ],
		position: i + 1,
		state: i < current ? 'complete' : i === current ? 'current' : 'upcoming',
	} ) );
}

/**
 * The Aponto brand mark (icon + wordmark).
 *
 * The same artwork the admin shell renders (`assets/src/admin/App.jsx`; source
 * `docs/mockups/v4/assets/img/aponto-logo.svg`), inlined here rather than imported from the SPA so
 * the wizard bundle never pulls the admin app in behind it. Decorative: the header's own heading
 * names the product.
 *
 * @return {any} The logo element.
 */
export function BrandLogo() {
	return (
		<svg
			className="aponto-wizard-logo"
			viewBox="0 0 918 208"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M386.272 165H348.64C347.8 160.8 345.28 151.56 342.088 139.968C332.68 139.8 323.272 139.8 316.048 139.8C309.328 139.8 299.584 139.8 290.344 139.968C286.984 150.888 284.464 160.128 283.288 165H248.512C260.608 133.584 285.64 57.144 291.52 39H342.256C348.304 57.312 373.168 132.912 386.272 165ZM297.4 116.28C304.12 116.28 310.84 116.28 316.048 116.28C321.256 116.28 328.312 116.28 335.2 116.112C331.504 103.344 327.472 89.904 323.944 78.984C320.248 68.736 318.064 60.672 316.384 54.96C314.536 60.672 312.016 68.568 308.488 79.32C305.296 90.408 301.264 103.512 297.4 116.28ZM419.612 188.352H387.692C388.196 171.384 388.196 137.952 388.196 111.744C388.196 92.592 388.196 77.472 387.86 63.192H419.444C419.444 66.216 419.276 68.736 419.276 71.256C419.276 73.608 419.108 75.96 418.94 78.312L420.284 78.816C426.164 68.232 437.42 61.512 454.388 61.512C480.428 61.512 492.86 79.992 492.86 113.76C492.86 147.696 477.74 166.68 453.884 166.68C436.412 166.68 425.492 159.96 419.78 151.56L419.108 151.728C419.276 156.096 419.276 160.128 419.276 165C419.276 165.168 419.276 165.336 419.276 165.672C419.276 173.232 419.444 180.456 419.612 188.352ZM462.62 113.928C462.62 93.096 455.732 85.704 442.796 85.704C429.188 85.704 418.772 92.592 418.772 110.232V136.608C424.316 140.136 431.54 141.984 441.116 141.984C455.9 141.984 462.62 134.592 462.62 113.928ZM605.288 112.416C605.288 146.016 585.128 167.184 551.36 167.184C517.76 167.184 498.104 146.016 498.104 112.416C498.104 78.648 519.272 60.84 551.36 60.84C583.448 60.84 605.288 78.648 605.288 112.416ZM575.048 113.424C575.048 94.944 565.976 87.384 551.36 87.384C536.912 87.384 527.672 94.44 527.672 113.424C527.672 132.24 536.744 140.808 551.36 140.808C566.312 140.808 575.048 131.904 575.048 113.424ZM717.821 165H686.069C686.405 150.72 686.573 130.56 686.573 106.536C686.573 92.592 682.037 87.216 669.269 87.216C656.501 87.216 646.757 93.936 646.757 111.24C646.757 143.664 646.925 154.92 647.093 165H615.509C616.013 150.72 616.013 138.288 616.013 114.936C616.013 92.928 615.845 77.136 615.509 63.192H647.261C647.093 69.408 646.925 73.776 646.589 79.488L647.597 79.656C653.813 67.056 665.573 61.68 682.373 61.68C705.053 61.68 717.653 72.264 717.653 99.648C717.653 114.096 717.317 121.32 717.317 130.392C717.317 143.16 717.317 153.912 717.821 165ZM766.725 63.696C776.805 63.528 788.229 63.528 798.477 63.192C798.141 71.088 797.805 82.008 797.973 90.072C790.581 89.904 778.653 89.568 766.389 89.4C766.221 100.824 766.221 113.088 766.221 126.528C766.221 135.768 770.085 138.96 779.997 138.96C786.381 138.96 792.429 137.616 797.301 135.6C797.805 144.504 799.653 155.424 800.661 162.816C791.589 164.832 786.045 166.344 775.125 166.344C745.725 166.344 735.813 151.392 735.813 130.392C735.813 119.304 736.149 102.672 736.317 89.064C732.621 88.896 729.261 88.896 726.573 88.896C726.573 88.392 726.573 87.888 726.573 87.384C726.573 81.336 726.573 72.768 726.405 67.392C737.157 64.368 755.301 52.776 766.389 41.52H767.397C767.061 48.576 766.893 55.968 766.725 63.696ZM911.166 112.416C911.166 146.016 891.006 167.184 857.238 167.184C823.638 167.184 803.982 146.016 803.982 112.416C803.982 78.648 825.15 60.84 857.238 60.84C889.326 60.84 911.166 78.648 911.166 112.416ZM880.926 113.424C880.926 94.944 871.854 87.384 857.238 87.384C842.79 87.384 833.55 94.44 833.55 113.424C833.55 132.24 842.622 140.808 857.238 140.808C872.19 140.808 880.926 131.904 880.926 113.424Z" fill="#282828" />
			<circle cx="104" cy="104" r="104" fill="#1C1C1C" />
			<path d="M85.8135 55.2393C93.8964 41.2393 114.104 41.2393 122.187 55.2393L161.685 123.652C169.768 137.652 159.664 155.152 143.498 155.152H64.5018C48.336 155.152 38.2323 137.652 46.3152 123.652L85.8135 55.2393Z" fill="white" />
			<circle cx="144.413" cy="87.8912" r="29.2609" fill="white" stroke="#1C1C1C" strokeWidth="11" />
		</svg>
	);
}

/**
 * The completed-step check glyph. Decorative — the list item carries a screen-reader label.
 *
 * @return {any} The icon element.
 */
function CheckGlyph() {
	return (
		<svg
			className="aponto-wizard-step-check"
			viewBox="0 0 16 16"
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="m3.5 8.3 3 3 6-6.6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * The six-step progress indicator.
 *
 * @param {Object} props       Component props.
 * @param {number} props.index Zero-based index of the step on screen.
 * @return {any} The progress element.
 */
export function StepProgress( { index } ) {
	const steps = stepStates( index );
	const current = steps.find( ( step ) => 'current' === step.state );
	const position = current ? current.position : 1;

	return (
		<nav
			className="aponto-wizard-progress"
			aria-label={ __( 'Setup progress', 'aponto' ) }
		>
			<ol className="aponto-wizard-steps">
				{ steps.map( ( step ) => (
					<li
						key={ step.key }
						className={ 'aponto-wizard-step is-' + step.state }
						data-step={ step.key }
						aria-current={
							'current' === step.state ? 'step' : undefined
						}
					>
						<span className="aponto-wizard-step-marker">
							{ 'complete' === step.state ? (
								<CheckGlyph />
							) : (
								step.position
							) }
						</span>
						<span className="aponto-wizard-step-label">
							{ step.label }
						</span>
						{ 'complete' === step.state && (
							<span className="aponto-wizard-sr">
								{ __( 'Completed', 'aponto' ) }
							</span>
						) }
					</li>
				) ) }
			</ol>
			{ /* Narrow-width fallback for the list above, which is screen-reader-only there.
			     `aria-hidden` because the list already states the same thing to assistive tech. */ }
			<p className="aponto-wizard-progress-compact" aria-hidden="true">
				{ sprintf(
					/* translators: 1: current step, 2: total steps. */
					__( 'Step %1$d of %2$d', 'aponto' ),
					position,
					steps.length
				) }
			</p>
		</nav>
	);
}

/**
 * The narrow-width progress track drawn along the header's bottom edge. Decorative.
 *
 * @param {Object} props          Component props.
 * @param {number} props.position 1-based position of the step on screen.
 * @param {number} props.total    Total number of steps.
 * @return {any} The track element.
 */
function ProgressTrack( { position, total } ) {
	return (
		<span className="aponto-wizard-progress-track" aria-hidden="true">
			<span
				className="aponto-wizard-progress-fill"
				style={ {
					width: Math.round( ( position / total ) * 100 ) + '%',
				} }
			/>
		</span>
	);
}

/**
 * The full-width wizard header: brand · progress · exit.
 *
 * @param {Object}        props           Component props.
 * @param {number}        props.index     Zero-based index of the step on screen.
 * @param {Function|null} props.onExit    The existing skip/leave handler, or null to hide the action.
 * @param {boolean}       props.exitBusy  Whether a request is in flight (disables the exit action).
 * @return {any} The header element.
 */
export function WizardHeader( { index, onExit, exitBusy } ) {
	const states = stepStates( index );
	const current = states.find( ( step ) => 'current' === step.state );

	return (
		<header className="aponto-wizard-header">
			<div className="aponto-wizard-brand">
				<BrandLogo />
				<span className="aponto-wizard-sr">
					{ __( 'Aponto', 'aponto' ) }
				</span>
			</div>
			<StepProgress index={ index } />
			<div className="aponto-wizard-header-end">
				{ onExit && (
					<Button
						className="aponto-wizard-exit"
						variant="tertiary"
						disabled={ exitBusy }
						onClick={ onExit }
					>
						{ __( 'Exit setup', 'aponto' ) }
					</Button>
				) }
			</div>
			<ProgressTrack
				position={ current ? current.position : 1 }
				total={ states.length }
			/>
		</header>
	);
}

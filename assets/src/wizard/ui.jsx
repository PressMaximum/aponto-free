/**
 * Shared wizard chrome (SPEC-P1 §4).
 *
 * `FieldStack` and `StepShell` used to live inside `index.js`; they moved here so individual steps
 * can be split into their own modules (and unit-tested in isolation) without importing the whole
 * app back into themselves.
 */
import { Card, CardBody, CardHeader, CardFooter, Flex } from '@wordpress/components';

/**
 * Vertical rhythm for a step body. Every control passes
 * `__nextHasNoMarginBottom` (the wp-components default from 6.7 on), so
 * `BaseControl` contributes NO bottom margin and a plain `CardBody` stacked the
 * field blocks flush: each label sat glued to the previous field's input. One
 * column stack owns the spacing instead — `gap` is a multiplier of the 4px grid.
 * The default is 12px, not the 16px wp-components uses in core screens: with a
 * 4px label-to-control gap inside each field the groups still read apart, and
 * the 20px it saves across the Business step is what brings that step's commit
 * action back above the fold at 1280x800 (QA V8b).
 *
 * @param {Object}      props          Component props.
 * @param {any}         props.children Stacked field blocks.
 * @param {number}      props.gap      Grid multiplier for the gap (default 3 = 12px).
 * @return {any} The stack element.
 */
export function FieldStack( { children, gap = 3 } ) {
	return (
		<Flex direction="column" gap={ gap } align="stretch" justify="flex-start">
			{ children }
		</Flex>
	);
}

/**
 * One wizard step: titled card, stacked body, footer with the step's actions.
 *
 * The title is the page's ONE `<h1>`: the full-screen chrome (SPEC-P1 §4) puts only the brand mark
 * in the header, and exactly one step is mounted at a time, so the step title is the page title.
 * It also carries `tabIndex={-1}` and accepts the app's `headingRef` so focus can be moved here on
 * every step change — otherwise a keyboard or screen-reader user who pressed "Continue" is left
 * with focus on a button that no longer exists and no announcement of where they landed.
 *
 * @param {Object} props            Component props.
 * @param {string} props.title      Step title.
 * @param {string} props.subtitle   Optional supporting line.
 * @param {any}    props.children   Step body.
 * @param {any}    props.footer     Step actions.
 * @param {Object} props.headingRef Ref the app focuses after a step change.
 * @param {string} props.variant    Optional card modifier class (`is-plain` drops the internal rules).
 * @param {number} props.gap        Grid multiplier for the body's field gap (default 3 = 12px).
 * @return {any} The card element.
 */
export function StepShell( {
	title,
	subtitle,
	children,
	footer,
	headingRef,
	variant = '',
	gap = 3,
} ) {
	return (
		<Card
			className={
				'aponto-wizard-card' + ( variant ? ' ' + variant : '' )
			}
		>
			<CardHeader>
				<div>
					<h1
						className="aponto-wizard-title"
						ref={ headingRef }
						tabIndex={ -1 }
					>
						{ title }
					</h1>
					{ subtitle && (
						<p className="aponto-wizard-subtitle">{ subtitle }</p>
					) }
				</div>
			</CardHeader>
			<CardBody>
				<FieldStack gap={ gap }>{ children }</FieldStack>
			</CardBody>
			{ footer && <CardFooter>{ footer }</CardFooter> }
		</Card>
	);
}

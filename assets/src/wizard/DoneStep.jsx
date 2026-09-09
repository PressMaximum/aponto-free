/**
 * Wizard step 6 — "Publish your booking page" + the completion action (SPEC-P1 §4 step 6).
 *
 * Three beta bugs lived in the old inline version of this step (report 2026-07-26):
 *
 *   1. the primary button only ever RE-POSTED the `page` action. Its label flipped to "Open booking
 *      page" once a page existed, but it carried no `href` and never navigated: clicking it looked
 *      like a dead button. The spec has always said "click again → open the existing page";
 *   2. every link came from an ABSOLUTE `get_permalink()`, i.e. bound to `home_url()`. An admin
 *      browsing on a different host than `siteurl` got a link their browser could not reach. The
 *      URLs are now same-origin relative (see `WizardService::pageInfo()`), computed server-side on
 *      every render — never a stale value carried in client state;
 *   3. there was no completion affordance at all. The funnel's `wizard_completed` stamp was only
 *      reachable as a side effect of creating a service, so a founder who skipped step 5 finished
 *      the flow into a collapsed menu with no way into the app. "Finish setup" now stamps it and
 *      routes to the dashboard.
 *
 * "Back" stays: the wizard's back-navigation semantics are per-step and harmless here, and no
 * wizard mockup exists to drop it (docs/mockups/v4 defers Settings/Onboarding — SPEC.md §7.9).
 *
 * Failure-mode guard: when a page exists but carries no usable address, NOTHING silently no-ops —
 * the open action is disabled and an explanatory warning is shown instead.
 */
import { Button, Notice, Flex, FlexItem, ExternalLink } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { StepShell } from './ui.jsx';

/**
 * Normalize the page DTO into the links the step can actually render.
 *
 * Extracted so the "is this link safe to render" decision is one testable pure function: a page
 * whose `viewUrl` is missing/blank must never become an anchor with an empty `href` (which reloads
 * the current admin screen and reads as "the button does nothing").
 *
 * @param {Object|null} page Page DTO from the wizard state / `page` action.
 * @return {{hasPage: boolean, viewUrl: string, editUrl: string, openable: boolean}} Link state.
 */
export function bookingPageLinks( page ) {
	const read = ( key ) =>
		page && 'string' === typeof page[ key ] ? page[ key ].trim() : '';
	const viewUrl = read( 'viewUrl' );

	return {
		hasPage: Boolean( page ),
		viewUrl,
		editUrl: read( 'editUrl' ),
		openable: Boolean( page ) && '' !== viewUrl,
	};
}

/**
 * Where "Finish setup" lands: the Aponto app's dashboard route.
 *
 * The admin SPA is a hash router whose default route is already `dashboard`, but the hash is stated
 * explicitly so the destination does not depend on that default. An empty `adminUrl` (the bootstrap
 * could not build one) returns '' and the caller falls back to the in-place confirmation screen
 * rather than navigating nowhere.
 *
 * @param {string} adminUrl Relative Aponto app URL from the bootstrap.
 * @return {string} Dashboard URL, or '' when there is none.
 */
export function dashboardUrl( adminUrl ) {
	const base = 'string' === typeof adminUrl ? adminUrl.trim() : '';
	if ( '' === base ) {
		return '';
	}

	return base.includes( '#' ) ? base : base + '#dashboard';
}

/**
 * Render step 6.
 *
 * @param {Object}      props              Component props.
 * @param {Object|null} props.page         Current booking-page DTO (null when none exists yet).
 * @param {boolean}     props.saving       Whether a request is in flight.
 * @param {Function}    props.busyLabel    Wraps a label into the shared "Saving…" spinner state.
 * @param {Function}    props.onBack       Go to the previous step.
 * @param {Function}    props.onCreatePage Create/publish the booking page.
 * @param {Function}    props.onFinish     Complete the wizard and go to the dashboard.
 * @param {Object}      props.headingRef   Ref the app focuses after a step change (SPEC-P1 §4).
 * @return {any} The step element.
 */
export function DoneStep( {
	page,
	saving,
	busyLabel,
	onBack,
	onCreatePage,
	onFinish,
	headingRef,
} ) {
	const links = bookingPageLinks( page );

	return (
		<StepShell
			headingRef={ headingRef }
			title={ __( 'Publish your booking page', 'aponto' ) }
			subtitle={ __(
				'Add the Aponto Booking Form block to any page — we can make one for you.',
				'aponto'
			) }
			footer={
				<Flex className="aponto-wizard-actions" justify="space-between">
					<FlexItem>
						<Button variant="tertiary" onClick={ onBack }>
							{ __( 'Back', 'aponto' ) }
						</Button>
					</FlexItem>
					<Flex className="aponto-wizard-actions-end" justify="flex-end">
						<FlexItem>
							{ links.hasPage ? (
								<Button
									variant="secondary"
									href={ links.openable ? links.viewUrl : undefined }
									target="_blank"
									rel="noreferrer"
									disabled={ ! links.openable }
									aria-disabled={ ! links.openable }
								>
									{ __( 'Open booking page', 'aponto' ) }
								</Button>
							) : (
								<Button
									variant="secondary"
									disabled={ saving }
									onClick={ onCreatePage }
								>
									{ busyLabel(
										__( 'Create booking page', 'aponto' )
									) }
								</Button>
							) }
						</FlexItem>
						<FlexItem>
							<Button
								variant="primary"
								disabled={ saving }
								onClick={ onFinish }
							>
								{ busyLabel( __( 'Finish setup', 'aponto' ) ) }
							</Button>
						</FlexItem>
					</Flex>
				</Flex>
			}
		>
			<p className="aponto-wizard-block-markup">
				&lt;!-- wp:aponto/booking-form {'{"align":"wide"}'} /--&gt;
			</p>
			{ links.hasPage && links.openable && (
				<Notice status="success" isDismissible={ false }>
					{ __( 'Your booking page is published and live.', 'aponto' ) }{ ' ' }
					<ExternalLink href={ links.viewUrl }>
						{ __( 'View page', 'aponto' ) }
					</ExternalLink>
					{ '' !== links.editUrl && (
						<>
							{ ' · ' }
							<ExternalLink href={ links.editUrl }>
								{ __( 'Edit page', 'aponto' ) }
							</ExternalLink>
						</>
					) }
				</Notice>
			) }
			{ links.hasPage && ! links.openable && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'Your booking page exists, but WordPress did not return a web address for it — check your permalink settings, then open the page from the Pages screen.',
						'aponto'
					) }{ ' ' }
					{ '' !== links.editUrl && (
						<ExternalLink href={ links.editUrl }>
							{ __( 'Edit page', 'aponto' ) }
						</ExternalLink>
					) }
				</Notice>
			) }
		</StepShell>
	);
}

/** @jsxImportSource preact */
/**
 * Step 4 — Payment method (SPEC-P1 §2.2, D-R38).
 *
 * Renders the method cards and the PANELS the gateways project into — and
 * nothing else. It owns no gateway state: the adapter lifecycle lives in
 * `app.jsx` because it has to outlive this component's renders, and the only
 * gateway-shaped thing here is `<slot name="ap-…">`, the projection target for a
 * holder that lives in the LIGHT DOM (spike: Stripe refuses to mount inside a
 * ShadowRoot, and its Payment Element fails silently when you try).
 *
 * Two details that look like mistakes and are not:
 *
 *  - The panel is hidden with `hidden` but the SLOTTED content is not, because
 *    hiding a shadow node does not hide what is projected into it. The adapter
 *    hides its own holder; both are needed.
 *  - The methods are real `<input type="radio">` in one named group, not the
 *    mockup's `role="button" aria-pressed` divs. Same picture, but arrow-key
 *    navigation, grouping and the "one of N" announcement come from the platform
 *    rather than from code that has to be maintained.
 */
import { DepositLines } from './DepositLines.jsx';
import { StepHeader } from './StepHeader.jsx';
import { Footer } from './Footer.jsx';
import { Banner } from './feedback.jsx';
import { COPY, sprintf } from '../lib/copy.js';
import { gatewayCopy, gatewayOwnsCta, slotName } from '../lib/payments.js';

/** The pseudo-method for "not online" — never sent to the server as a method. */
export const ONSITE = 'onsite';

/**
 * The method list for one configuration: every gateway this build can draw, plus
 * the on-site option when — and only when — the site allows it (`optional`).
 *
 * @param {Array}  gateways Renderable gateways.
 * @param {string} mode     `optional` | `required`.
 * @return {Array<{key:string, title:string, sub:string, gateway:?Object}>} Methods.
 */
export function paymentMethods( gateways, mode ) {
	const methods = ( gateways || [] ).map( ( gateway ) => {
		const copy = gatewayCopy( gateway );
		return {
			key: gateway.code,
			title: copy.title,
			sub: copy.sub,
			gateway,
		};
	} );
	if ( mode === 'optional' ) {
		methods.push( {
			key: ONSITE,
			title: COPY.pay_onsite_title,
			sub: COPY.pay_onsite_sub,
			gateway: null,
		} );
	}
	return methods;
}

export function PaymentStep( {
	gateways,
	mode,
	method,
	onMethod,
	totalLabel,
	paymentTerms = null,
	paymentChoice = null,
	currency,
	locale,
	currencyExponent,
	gatewayLoading,
	gatewayReady,
	// True while a gateway that owns the CTA has an attempt in flight (D-R40,
	// Codex r1 #5). Everything that would ABANDON the booking is refused for as
	// long as it lasts — Back, the method radios, "Pay on-site instead" — because
	// each of them releases the held slot, and the gateway may be moments away
	// from capturing against the order that hold belongs to. The buyer's own way
	// out is closing the gateway's window, which ends the attempt.
	locked,
	error,
	notice,
	// A live hold's deadline (resume path): the single most useful fact on this
	// screen for somebody who left and came back.
	deadlineLabel = '',
	resuming = false,
	onRetry,
	onPayOnsite,
	stepIndex,
	progress,
	stepCount,
	focusOnMount,
	onBack,
	onSubmit,
	submitting,
} ) {
	const methods = paymentMethods( gateways, mode );
	const online = method !== ONSITE;
	// PayPal's buttons open their popup from a click on PayPal's own iframe, so
	// a primary button beside them could not start the payment even if it looked
	// like it should. The step drops its CTA rather than showing a dead one.
	const methodCopy = online ? gatewayCopy( gateways.find( ( gateway ) => gateway.code === method ) || method ) : null;
	const ctaOwned = online && gatewayOwnsCta( method ) && ! methodCopy?.footerLabel;

	return (
		<div class="ap-step">
			<StepHeader
				title={ COPY.payment_title }
				sub={ COPY.payment_sub }
				stepIndex={ stepIndex }
				progress={ progress }
				stepCount={ stepCount }
				focusOnMount={ focusOnMount }
			/>

			{ notice && (
				<Banner variant="warn" title={ notice.title } body={ notice.body }>
					<div class="ap-note-actions">
						{ /*
						 * "Try again" is dropped when the server said the refusal is
						 * DETERMINISTIC (`retryable: false`, rest-contract §3.3 — the
						 * gateway cannot express this order's amount or currency). An
						 * action that cannot work is worse than no action: it reads as
						 * "the site is flaky" for something only the operator can fix.
						 * Absent means retryable, so every other notice is unchanged.
						 */ }
						{ notice.retry !== false && (
							<button
								type="button"
								class="ap-link"
								onClick={ onRetry }
								disabled={ locked }
							>
								{ COPY.try_again }
							</button>
						) }
						{ mode === 'optional' && (
							<button
								type="button"
								class="ap-link"
								onClick={ onPayOnsite }
								disabled={ locked }
							>
								{ COPY.pay_onsite_instead }
							</button>
						) }
					</div>
				</Banner>
			) }

			{ deadlineLabel ? (
				<p class="ap-pay-deadline">
					{ sprintf( COPY.pay_held_until, deadlineLabel ) }
				</p>
			) : null }

			{ paymentChoice }
			<DepositLines order={ paymentTerms } currency={ currency } locale={ locale } currencyExponent={ currencyExponent } />
			<div class="ap-pay-list">
				{ methods.map( ( m ) => (
					<label
						key={ m.key }
						class={
							'ap-pay' +
							( method === m.key ? ' sel' : '' ) +
							( locked ? ' locked' : '' )
						}
					>
						<input
							type="radio"
							name="ap-pay-method"
							value={ m.key }
							checked={ method === m.key }
							disabled={ locked }
							onChange={ () => onMethod( m.key ) }
						/>
						<span class="radio" aria-hidden="true" />
						<span class="txt">
							<span class="ap-item-title">{ m.title }</span>
							{ m.sub ? <small>{ m.sub }</small> : null }
						</span>
					</label>
				) ) }
			</div>

			{ /* One panel per gateway, always mounted while the step is: the slot
			     has to exist for the light-DOM holder to be projected, and a
			     holder that is re-parented reloads its iframe (spike caveat 2). */ }
			{ ( gateways || [] ).map( ( g ) => (
				<div
					key={ g.code }
					class="ap-card-shell"
					data-gateway={ g.code }
					hidden={ method !== g.code }
				>
					<p class="cap">
						<span>{ gatewayCopy( g ).panel }</span>
						{ /* Not a claim to make on a page served over plain http (persona QA 2026-10-05, T-031). */ }
						{ typeof window !== 'undefined' && window.location?.protocol === 'https:' ? (
							<span>{ COPY.pay_secure }</span>
						) : null }
					</p>
					{ gatewayLoading && method === g.code && (
						<p class="ap-pay-loading">{ COPY.pay_loading }</p>
					) }
					<slot name={ slotName( g.code ) } />
				</div>
			) ) }

			{ /* Said once, where the missing Pay button would have been: a step
			     whose CTA lives inside the gateway's own box has to name it, or
			     the visitor reads the empty footer as a broken form — and while
			     the attempt is in flight it names the reason Back and the method
			     cards have gone quiet. */ }
			{ ctaOwned && ! gatewayLoading && (
				<p class="ap-pay-hint">
					{ locked
						? COPY.pay_cta_gateway_busy
						: methodCopy?.ctaHint || COPY.pay_cta_gateway }
				</p>
			) }

			{ /* Errors are announced, not just shown: the customer may be reading
			     with a screen reader when a card is declined. */ }
			<p class="ap-pay-error" role="alert" aria-live="assertive">
				{ error || '' }
			</p>

			<div class="ap-note">
				{ online
					? methodCopy?.checkoutNote || sprintf( COPY.pay_note_now, totalLabel )
					: sprintf( COPY.pay_note_onsite, totalLabel ) }
			</div>

			<Footer
				onBack={ onBack }
				backDisabled={ !! locked }
				onPrimary={ ctaOwned ? null : onSubmit }
				primaryLabel={
					online
						? methodCopy?.footerLabel || sprintf(
								resuming ? COPY.pay_cta_resume : COPY.pay_cta,
								totalLabel
						  )
						: COPY.book
				}
				primaryDisabled={ online && ! gatewayReady }
				busy={ submitting }
				busyLabel={ methodCopy?.busyLabel || COPY.pay_busy }
			/>
		</div>
	);
}

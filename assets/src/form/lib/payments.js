/**
 * Gateway seam for the Payment step (D-R38 / D-R39).
 *
 * The widget knows FOUR verbs and nothing about any gateway: `mount()` puts the
 * gateway's own UI on the page, `setVisible()` shows or hides it as the method
 * changes, `submit()` runs whatever sequence that gateway needs to end up with a
 * reference core can confirm, and `destroy()` takes it all down again. Adding a
 * gateway is adding an entry to {@link FACTORIES} and a file under `payments/`;
 * nothing in `app.jsx` learns its name.
 *
 * ### Who presses the button
 *
 * `submit()` assumes the STEP owns the call to action. An adapter may instead
 * declare `ownsCta`, in which case the step hides its primary button and the
 * sequence starts inside the adapter. The widget's half of it arrives as
 * `mount({flow})`: `checkout()` (validate, then the booking POST that mints the
 * hold and the order), `confirm(ref)` (ask the server what really happened) and
 * `settle(out)` (apply one outcome, in the same shape `submit()` resolves with).
 * Same code paths, same funnel, different trigger — and still nothing in
 * `app.jsx` that names a gateway.
 *
 * ### Why the mount node is not part of the Preact tree
 *
 * The spike (`docs/research/spike-payments-inline-results.md`) is normative here:
 * **Stripe refuses to mount inside a ShadowRoot**, and the Payment Element fails
 * SILENTLY when you try — no throw, no `loaderror`, just an element that never
 * becomes ready. The only working shape is the one PayPal's zoid already applies
 * to itself: a holder in the LIGHT DOM, a child of the widget host, projected
 * back into the shadow tree through a `<slot>`. So each adapter creates and owns
 * its holder imperatively, Preact only renders `<slot name="ap-…" />`, and the
 * holder is never re-parented after mount (moving an iframe reloads it).
 *
 * Two consequences the spike measured and this seam encodes: hiding the shadow
 * panel does NOT hide slotted content (visibility is toggled on the holder), and
 * the holder is reachable by the site's theme (see the shield in `payments/host.js`).
 */

import { __ } from '@wordpress/i18n';
import { COPY } from './copy.js';
import {
	factories,
	ctaOwners,
	gatewaySpecificCopy,
} from '@aponto/payment-gateways';

export { slotName, injectShield, SHIELD_ID } from './payments/host.js';

/**
 * Adapter factories by payment module code. A gateway the server offers but this
 * bundle has no factory for is simply not rendered — the customer sees the
 * methods that can actually take their money.
 */
/**
 * Build the adapter for one offered gateway, or null when this build cannot
 * render it.
 *
 * `offered` is passed on because at least one gateway's UI depends on what ELSE
 * the checkout takes: PayPal drops its card funding source when Stripe is also
 * offered, so the buyer is not shown two card forms on one step.
 *
 * @param {Object} gateway   `{code, label, client}` from the boot config.
 * @param {Array}  [offered] Every renderable gateway this checkout offers.
 * @return {?Object} Adapter.
 */
export function createGatewayAdapter( gateway, offered ) {
	const factory = factories[ gateway && gateway.code ];
	return factory ? factory( gateway, offered || [] ) : null;
}

/**
 * Whether this gateway's own control replaces the step's primary button.
 *
 * @param {string} code Payment module code.
 * @return {boolean} True when the gateway owns the CTA.
 */
export function gatewayOwnsCta( code ) {
	return ctaOwners.includes( String( code || '' ) );
}

/**
 * Whether this build can render a gateway at all (drives the method list).
 *
 * @param {Object} gateway Gateway entry.
 * @return {boolean} True when a factory exists.
 */
export function isRenderable( gateway ) {
	return !! factories[ gateway && gateway.code ];
}

/**
 * Visitor-facing copy for one method card and its panel.
 *
 * The widget owns the copy for the gateways it can draw, so a card method reads
 * like a card method rather than like a module code; the server-supplied `label`
 * is the fallback for a gateway some future driver adds.
 *
 * `panel`, `unavailable` and `cancelled` are here rather than in `copy.js` for
 * the same reason the titles are: they NAME the method, and a step that says
 * "Card details" over PayPal's buttons — or tells a PayPal customer that "card
 * payments are temporarily unavailable" — is describing a gateway it is not
 * showing.
 *
 * @param {Object|string} gateway Gateway entry, or its code.
 * @return {{title:string, sub:string, panel:string, unavailable:string, cancelled:string, paidLine:string}} Copy.
 */
export function gatewayCopy( gateway ) {
	const code =
		typeof gateway === 'string' ? gateway : ( gateway || {} ).code;
	const ownedCopy = gatewaySpecificCopy( gateway );
	if ( ownedCopy ) {
		return ownedCopy;
	}
	const label = typeof gateway === 'string' ? '' : ( gateway || {} ).label;
	return {
		title: label || '',
		sub: '',
		panel: label || '',
		unavailable: __(
			'This payment method is temporarily unavailable.',
			'aponto'
		),
		cancelled: __(
			'The payment was cancelled — you can try again.',
			'aponto'
		),
		paidLine: COPY.pay_paid_line,
	};
}

/**
 * The sentence for a gateway whose UI never became usable.
 *
 * @param {string} code Payment module code.
 * @return {string} Customer-facing sentence.
 */
export function gatewayUnavailableCopy( code ) {
	return gatewayCopy( code ).unavailable;
}

/**
 * The sentence for a gateway the customer closed without paying.
 *
 * @param {string} code Payment module code.
 * @return {string} Customer-facing sentence.
 */
export function gatewayCancelledCopy( code ) {
	return gatewayCopy( code ).cancelled;
}

/**
 * The confirmation line for a booking paid through one gateway.
 *
 * @param {string} code Payment module code.
 * @return {string} A `sprintf` template taking the amount and the order code.
 */
export function gatewayPaidLineCopy( code ) {
	return gatewayCopy( code ).paidLine;
}

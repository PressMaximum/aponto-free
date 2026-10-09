/**
 * Refund dialog copy, kept free of component imports so it is unit-testable and stays inside the
 * dialog's own chunk (only `RefundDialog.jsx` imports it).
 */
import { __, sprintf } from '@wordpress/i18n';
import { money } from './format.js';
import { gatewayLabel } from './payment-status.js';

/**
 * What the dialog promises about a refund, before the operator confirms it.
 *
 * A gateway Aponto drives directly returns the money itself and leaves the booking alone. An order
 * settled through an external checkout platform (it carries an `externalOrder` record) is refunded
 * by that platform: some of its payment methods cannot refund automatically, in which case only the
 * refund is recorded there, and the platform's own status rules may cancel a fully refunded
 * upcoming booking. The copy must not promise otherwise.
 *
 * @param {Object} order Order block (adapter shape).
 * @return {string} Notice text.
 */
export function refundNotice( order ) {
	const amount = money( order.refundableMinor || 0, order.currency, order.currencyExponent ?? null );
	if ( order.externalOrder ) {
		return sprintf(
			/* translators: 1: refundable amount, formatted as money. 2: checkout platform name, e.g. "WooCommerce". */
			__(
				'%1$s of this payment can still be refunded through %2$s. If the payment method used there refunds automatically, the money goes back to the customer. Otherwise only the refund is recorded and you return the money to the customer yourself. A full refund can cancel an upcoming booking, depending on your status rules.',
				'aponto'
			),
			amount,
			gatewayLabel( order.gateway )
		);
	}

	return sprintf(
		/* translators: 1: refundable amount, formatted as money. 2: gateway name, e.g. "Stripe". */
		__(
			'%1$s of this payment can still be refunded through %2$s. The money goes back to the card the customer paid with; the booking is not cancelled.',
			'aponto'
		),
		amount,
		gatewayLabel( order.gateway )
	);
}

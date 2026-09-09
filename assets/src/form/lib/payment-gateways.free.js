/**
 * Booking-form payment gateways owned by the Free edition.
 *
 * This registry is selected at build time. Premium gateways must never be
 * imported here because `assets/src/form/**` is distributed in the wp.org ZIP.
 */

import { __ } from '@wordpress/i18n';
import { createStripeAdapter } from './payments/stripe.js';

export const factories = {
	payments_stripe: createStripeAdapter,
};

export const ctaOwners = [];

/**
 * Visitor-facing copy owned by a Free gateway.
 *
 * @param {Object|string} gateway Gateway entry, or its code.
 * @return {?Object} Gateway copy, or null when this registry does not own it.
 */
export function gatewaySpecificCopy( gateway ) {
	const code =
		typeof gateway === 'string' ? gateway : ( gateway || {} ).code;
	if ( code !== 'payments_stripe' ) {
		return null;
	}
	return {
		title: __( 'Credit / debit card', 'aponto' ),
		sub: __( 'Secured checkout · Visa, Mastercard, Amex', 'aponto' ),
		panel: __( 'Card details', 'aponto' ),
		unavailable: __(
			'Card payments are temporarily unavailable.',
			'aponto'
		),
		cancelled: __(
			'The payment was cancelled — you can try again.',
			'aponto'
		),
		/* translators: 1: formatted amount paid, 2: order code, e.g. "AP-7Q2F4". */
		paidLine: __( 'Paid %1$s by card · reference %2$s', 'aponto' ),
	};
}

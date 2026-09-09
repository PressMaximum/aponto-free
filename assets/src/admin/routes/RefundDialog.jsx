/**
 * Refund confirmation dialog — its OWN chunk (`admin-chunk-refund-dialog`).
 *
 * The most rarely opened surface in the admin: a refund needs a paid order, an enabled
 * gateway module and a deliberate click on a destructive action. It is also perfectly
 * self-contained — an amount, a reason and one call — which is why it was the first thing
 * to take out of `admin.js` when the payment surfaces pushed it past its ~150 KB gz cap
 * (AGENTS §6; the P3 handoff §4 debt item names this dialog). Its `Modal`/`Button` imports
 * ride the `wp-components` external, so what leaves the entry bundle is the dialog itself
 * plus the refund-amount helpers nothing else on the eager path uses.
 *
 * Kept as a component in its own file rather than inlined in `BookingEditor`: the
 * amount/reason state is BORN when the dialog opens and dies when it closes — a refund
 * amount left in the editor's state after a cancel is a number nobody chose, sitting one
 * click away from being sent.
 *
 * The amount defaults to everything still refundable, which is the common case (a full refund)
 * and is also the safe direction to be wrong in: it is visible and editable, and the server
 * refuses anything above it anyway (D-R38a(2)).
 */
import { useState } from 'react';
import { Button, Modal } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { minorToMajor, money } from '../lib/format.js';
import { gatewayLabel, refundAmountError, parseRefundAmount } from '../lib/payment-status.js';

export function RefundDialog( { order, busy, onCancel, onConfirm } ) {
	const refundable = order.refundableMinor || 0;
	const exponent = order.currencyExponent ?? null;
	const [ amount, setAmount ] = useState( () => String( minorToMajor( refundable, order.currency, exponent ) ) );
	const [ reason, setReason ] = useState( '' );
	const error = refundAmountError( amount, refundable, order.currency, exponent );
	const minor = parseRefundAmount( amount, order.currency, exponent );

	return (
		<Modal
			title={ __( 'Refund this payment', 'aponto' ) }
			onRequestClose={ busy ? () => {} : onCancel }
			className="ap-confirm-modal"
			size="small"
			focusOnMount="firstContentElement"
		>
			<div className="ap-confirm">
				<p className="ap-confirm-message">
					{ sprintf(
						/* translators: 1: refundable amount, formatted as money. 2: gateway name, e.g. "Stripe". */
						__(
							'%1$s of this payment can still be refunded through %2$s. The money goes back to the card the customer paid with; the booking is not cancelled.',
							'aponto'
						),
						money( refundable, order.currency, exponent ),
						gatewayLabel( order.gateway )
					) }
				</p>
				<label className="ap-refund-field">
					<span>
						{ sprintf(
							/* translators: %s: ISO currency code, e.g. "USD". */
							__( 'Amount (%s)', 'aponto' ),
							order.currency
						) }
					</span>
					<input
						className="ap-confirm-input"
						type="text"
						inputMode="decimal"
						value={ amount }
						onChange={ ( e ) => setAmount( e.target.value ) }
					/>
				</label>
				{ error ? <p className="ap-refund-error">{ error }</p> : null }
				<label className="ap-refund-field">
					<span>{ __( 'Reason (optional, recorded in the activity log)', 'aponto' ) }</span>
					<textarea
						className="ap-confirm-input"
						rows={ 2 }
						value={ reason }
						onChange={ ( e ) => setReason( e.target.value ) }
					/>
				</label>
				<div className="ap-confirm-actions">
					<Button variant="tertiary" disabled={ busy } onClick={ onCancel }>{ __( 'Cancel', 'aponto' ) }</Button>
					<Button
						variant="primary"
						isDestructive
						isBusy={ busy }
						disabled={ busy || !! error }
						onClick={ () => onConfirm( { amountMinor: minor, reason } ) }
					>
						{ busy
							? __( 'Refunding…', 'aponto' )
							: sprintf(
									/* translators: %s: amount to refund, formatted as money. */
									__( 'Refund %s', 'aponto' ),
									money( minor || 0, order.currency, exponent )
							  ) }
					</Button>
				</div>
			</div>
		</Modal>
	);
}

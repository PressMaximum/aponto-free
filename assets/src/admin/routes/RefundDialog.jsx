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
import { generateUuid } from '../../form/lib/idempotency.js';
import { Button, Modal } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { minorToMajor, money } from '../lib/format.js';
import { gatewayLabel, refundAmountError, parseRefundAmount } from '../lib/payment-status.js';
import { refundNotice } from '../lib/refund-notice.js';

export function RefundDialog( { order, busy, onCancel, onConfirm, onsite = false } ) {
	const charges = ( order.refundableCharges || [] ).filter( ( charge ) => charge.refundable_minor > 0 && charge.available !== false );
	const [ transactionId, setTransactionId ] = useState( charges[ 0 ]?.transaction_id ?? charges[ 0 ]?.id ?? null );
	const charge = charges.find( ( item ) => ( item.transaction_id ?? item.id ) === transactionId );
	const refundable = onsite ? order.onsiteRefundableMinor : charge?.refundable_minor ?? ( Array.isArray( order.refundableCharges ) ? 0 : order.refundableMinor ?? 0 );
	const gateway = charge?.gateway || order.gateway;
	const [ idempotency ] = useState( generateUuid );
	const [ attempted, setAttempted ] = useState( false );
	const exponent = order.currencyExponent ?? null;
	const [ amount, setAmount ] = useState( () => String( minorToMajor( refundable, order.currency, exponent ) ) );
	const [ reason, setReason ] = useState( '' );
	const error = refundAmountError( amount, refundable, order.currency, exponent );
	const minor = parseRefundAmount( amount, order.currency, exponent );

	return (
		<Modal
			title={ onsite ? __( 'Record an on-site refund', 'aponto' ) : __( 'Refund this payment', 'aponto' ) }
			onRequestClose={ busy ? () => {} : onCancel }
			className="ap-confirm-modal"
			size="small"
			focusOnMount="firstContentElement"
		>
			<div className="ap-confirm">
				<p className="ap-confirm-message">
					{ onsite
						? __( 'Only record this after you have returned the money to the customer outside Aponto. This action does not transfer money or cancel the booking.', 'aponto' )
						// The selected charge's refundable amount and gateway (D-R71: a deposit order can
						// hold a deposit charge and a balance charge on different gateways).
						: refundNotice( { ...order, refundableMinor: refundable, gateway } ) }
				</p>
				{ ! onsite && charges.length > 1 ? <label className="ap-refund-field">
					<span>{ __( 'Payment to refund', 'aponto' ) }</span>
					<select className="ap-confirm-input" value={ transactionId } disabled={ busy } onChange={ ( event ) => {
						const id = Number( event.target.value );
						setTransactionId( id );
						const selected = charges.find( ( item ) => ( item.transaction_id ?? item.id ) === id );
						setAmount( String( minorToMajor( selected.refundable_minor, order.currency, exponent ) ) );
					} }>
						{ charges.map( ( item ) => <option key={ item.transaction_id ?? item.id } value={ item.transaction_id ?? item.id }>{ gatewayLabel( item.gateway ) + ' · #' + ( item.transaction_id ?? item.id ) + ' · ' + money( item.refundable_minor, order.currency, exponent ) }</option> ) }
					</select>
				</label> : null }
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
						disabled={ busy || ( onsite && attempted ) }
						value={ amount }
						onChange={ ( e ) => setAmount( e.target.value ) }
					/>
				</label>
				{ error ? <p className="ap-refund-error">{ error }</p> : null }
				{ ! onsite ? <label className="ap-refund-field">
					<span>{ __( 'Reason (optional, recorded in the activity log)', 'aponto' ) }</span>
					<textarea
						className="ap-confirm-input"
						rows={ 2 }
						value={ reason }
						onChange={ ( e ) => setReason( e.target.value ) }
					/>
				</label> : null }
				<div className="ap-confirm-actions">
					<Button variant="tertiary" disabled={ busy } onClick={ onCancel }>{ __( 'Cancel', 'aponto' ) }</Button>
					<Button
						variant="primary"
						isDestructive
						isBusy={ busy }
						disabled={ busy || !! error }
						onClick={ () => { setAttempted( true ); onConfirm( { amountMinor: minor, reason, transactionId, idempotency, onsite } ); } }
					>
						{ busy
							? ( onsite ? __( 'Recording…', 'aponto' ) : __( 'Refunding…', 'aponto' ) )
							: sprintf(
									/* translators: %s: amount to refund, formatted as money. */
									onsite ? __( 'Record refund %s', 'aponto' ) : __( 'Refund %s', 'aponto' ),
									money( minor || 0, order.currency, exponent )
							  ) }
					</Button>
				</div>
			</div>
		</Modal>
	);
}

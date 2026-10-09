/** @jsxImportSource preact */
/** Server-owned deposit amounts for previews and settled orders (D-R71). */
import { COPY } from '../lib/copy.js';
import { formatMoney } from '../lib/format.js';

export function isDepositOrder( order ) {
	return !! order && Number.isInteger( order.payable_now_minor ) && order.payable_now_minor > 0 && order.payable_now_minor < order.total_minor;
}

export function DepositLines( { order, currency, locale, currencyExponent, settled = false } ) {
	if ( ! isDepositOrder( order ) ) return null;
	const money = ( value ) => formatMoney( value, currency, locale, currencyExponent );
	return <>
		<div class="ap-sum-total"><span>{ settled ? ( order.payment_state_reason === 'deposit_paid' ? COPY.deposit_paid : COPY.amount_paid ) : COPY.deposit_due }</span><span class="v">{ money( settled ? order.net_collected_minor : order.payable_now_minor ) }</span></div>
		<div class="ap-sum-total"><span>{ settled ? COPY.balance_due : COPY.balance_onsite }</span><span class="v">{ money( settled ? order.balance_due_minor : ( order.balance_minor ?? order.balance_on_site_minor ) ) }</span></div>
		<p class="ap-sum-sub">{ COPY.deposit_cancel_note }</p>
	</>;
}

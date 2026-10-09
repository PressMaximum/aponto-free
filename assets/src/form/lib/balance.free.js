/** @jsxImportSource preact */
import { __ } from '@wordpress/i18n';

/** A saved balance link must never turn into an unrelated new booking. */
export function balanceToken( hash ) {
	return (
		new URLSearchParams( String( hash || '' ).replace( /^#/, '' ) ).get(
			'aponto_balance'
		) || ''
	);
}

export function BalanceEntry() {
	return (
		<div className="ap-wrap">
			<div className="ap">
				<div className="ap-main narrow">
					<p>
						{ __(
							'Online payment is not available for this balance. Contact the business for help.',
							'aponto'
						) }
					</p>
				</div>
			</div>
		</div>
	);
}

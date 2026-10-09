/**
 * Booking-form order adjustments owned by the Free edition: none.
 *
 * Selected at build time through the `@aponto/form-coupons` alias
 * (webpack.config.js). The Premium module under `assets/src/pro/` supplies the
 * real implementation; `assets/src/form/**` ships in the wp.org ZIP, so this
 * file must stay a neutral no-op (D-R41: the Free zip carries no paid
 * implementation).
 */

/** Extra shadow-root CSS the Free build needs: nothing. */
export const formCouponCss = '';

const NONE = Object.freeze( {
	active: false,
	quote: null,
	draftCode: '',
	totalMinor: null,
	fieldKey: '',
	validate: () => '',
	reset: () => {},
	handleBookingError: () => '',
	renderField: () => null,
	renderSummaryRows: () => null,
} );

/**
 * The widget's order-adjustment state. Free has none, so every call answers the
 * same inert object (no hooks are called, so the rules of hooks hold trivially).
 *
 * @return {Object} Inert adjustment state.
 */
export function useFormCoupon() {
	return NONE;
}

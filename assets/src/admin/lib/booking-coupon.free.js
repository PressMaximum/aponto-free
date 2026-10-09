/**
 * Booking-editor order-adjustment controls owned by the Free edition: none.
 *
 * Selected at build time through the `@aponto/admin-booking-coupon` alias
 * (webpack.config.js); Premium resolves its module under `assets/src/pro/`.
 * This file ships in the wp.org ZIP, so it stays inert (D-R41): an existing
 * order's discount snapshot is still displayed read-only by BookingEditor.jsx
 * itself, but nothing here can quote, apply or edit one.
 */

const NONE = Object.freeze( {
	createQuote: null,
	createCode: '',
	createBlocker: () => '',
	handleCreateError: () => false,
	createControl: null,
	renderEditControl: () => null,
} );

/**
 * @return {Object} Inert adjustment state (no hooks are called).
 */
export function useBookingCoupon() {
	return NONE;
}

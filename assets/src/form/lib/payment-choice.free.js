/** Edition-neutral seam: Free offers no customer payment-amount choice. */
export function usePaymentChoice() {
	return { reset: () => {}, terms: null, amountMode: '', render: () => null };
}

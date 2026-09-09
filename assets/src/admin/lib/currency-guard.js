/**
 * Currency-change guard for the Settings save flow (Codex review item 1, Settings leg).
 *
 * Stored prices are integer minor units whose meaning depends on the store currency's ISO-4217
 * exponent — saving a different currency re-interprets every existing price at the new scale
 * (a 2500-minor $25.00 service reads as ₫2,500 after a USD→VND switch). The wizard leg re-scales
 * its own prices; the Settings surface instead warns and asks for explicit confirmation before
 * the save proceeds (minimal P1 — FX conversion for established catalogs is out of scope).
 */

/**
 * Whether a pending Settings save changes the store currency and therefore needs the confirm
 * prompt. `edited` only ever holds keys that differ from the saved snapshot, but the comparison
 * is kept as belt-and-braces; an unknown previous value (missing from the snapshot) still counts
 * as a change.
 *
 * @param {Object} savedFlat Flat saved-settings snapshot (dotted keys).
 * @param {Object} edited    Flat dirty-diff map (dotted keys).
 * @return {boolean} True when the save would change `currency`.
 */
export function currencyChangeRequiresConfirm( savedFlat, edited ) {
	if ( ! edited || ! Object.prototype.hasOwnProperty.call( edited, 'currency' ) ) {
		return false;
	}
	return edited.currency !== ( savedFlat || {} ).currency;
}

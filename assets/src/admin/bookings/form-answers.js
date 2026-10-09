/**
 * Booking-form answers as the booking drawer prints them. Kept apart from the editor so the rule
 * is unit-testable without mounting it.
 */
import { __ } from '@wordpress/i18n';

/**
 * A booking-form answer as the drawer prints it (persona QA 2026-10-05, T-046): a ticked checkbox
 * is stored as `1`, which is not an answer a person reads — it is "Yes".
 *
 * @param {{type?: string, value: string}} field Answer from the detail DTO.
 * @return {string} Display value.
 */
export function customFieldValue( field ) {
	if ( 'checkbox' === field?.type ) {
		return '1' === String( field.value ) ? __( 'Yes', 'aponto' ) : __( 'No', 'aponto' );
	}
	return field?.value ?? '';
}

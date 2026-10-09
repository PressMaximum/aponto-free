import { __ } from '@wordpress/i18n';

/** A saved booking does not imply that the linked order was synchronized. */
export function externalSyncNotice( external ) {
	if ( external?.sync === 'review' ) {
		return __( 'Booking saved. External order synchronization needs review.', 'aponto' );
	}
	if ( external?.sync === 'pending' ) {
		return __( 'Booking saved. External order synchronization is pending.', 'aponto' );
	}
	return '';
}

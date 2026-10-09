/**
 * Copy text to the clipboard, falling back to a selection copy when the async API is unavailable.
 *
 * An admin served over plain HTTP is not a secure context, so `navigator.clipboard` is undefined
 * there and calling it throws a raw TypeError at the operator (webhooks UI review W-UI-04). The
 * legacy `execCommand( 'copy' )` path still works in every browser the admin supports; when that
 * fails too the caller gets `false` and owes the operator a manual-copy hint.
 *
 * Same behaviour as the private helpers in the Google/Outlook/PayPal panels, which predate this
 * module and can move onto it in a follow-up.
 *
 * @param {string} text Text to copy.
 * @return {Promise<boolean>} Whether the copy succeeded.
 */
export async function copyText( text ) {
	try {
		if ( typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext ) {
			await navigator.clipboard.writeText( text );

			return true;
		}
	} catch ( e ) {
		// Fall through to the legacy path.
	}

	try {
		const field = document.createElement( 'textarea' );
		field.value = text;
		field.setAttribute( 'readonly', '' );
		field.style.position = 'fixed';
		field.style.opacity = '0';
		document.body.appendChild( field );
		field.select();
		const ok = typeof document.execCommand === 'function' && document.execCommand( 'copy' );
		document.body.removeChild( field );

		return Boolean( ok );
	} catch ( e ) {
		return false;
	}
}

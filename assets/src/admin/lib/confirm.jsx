/**
 * Imperative confirm/prompt dialog for destructive admin flows (C13, review F item 3).
 *
 * Built directly on the wp-components Modal (not __experimentalConfirmDialog, whose global
 * Enter-to-confirm keydown is exactly what a destructive flow must NOT have):
 *   - the Modal `title` is the dialog's accessible name (Modal wires aria-labelledby to it);
 *   - default focus never lands on the confirm button: `focusOnMount="firstContentElement"`
 *     focuses the reason textarea when there is a prompt, otherwise the CANCEL button (rendered
 *     first) — so a stray Enter cancels (or inserts a newline), never auto-confirms;
 *   - `destructive: true` renders the confirm button with isDestructive styling;
 *   - Escape / the X button cancel.
 *
 * `useConfirmDialog()` returns `{ confirm, dialog }`:
 *   - `confirm(opts)` opens the dialog and returns a Promise that resolves to
 *       · `false` when cancelled;
 *       · `true` when confirmed and `opts.prompt` is falsy;
 *       · the entered string (possibly '') when confirmed and `opts.prompt` is truthy.
 *   - `dialog` is a node to render ONCE in the component tree.
 *
 * opts: { title?, message?, confirmText?, cancelText?, destructive?, prompt?, promptLabel?,
 *         promptPlaceholder?, promptValue? }
 */
import { useState, useCallback, useRef } from 'react';
import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export function useConfirmDialog() {
	const [ options, setOptions ] = useState( null );
	const [ value, setValue ] = useState( '' );
	const resolver = useRef( null );

	const confirm = useCallback( ( opts ) => {
		setValue( ( opts && opts.promptValue ) || '' );
		setOptions( opts || {} );
		return new Promise( ( resolve ) => {
			resolver.current = resolve;
		} );
	}, [] );

	const settle = useCallback( ( result ) => {
		const resolve = resolver.current;
		resolver.current = null;
		setOptions( null );
		if ( resolve ) {
			resolve( result );
		}
	}, [] );

	const dialog = options ? (
		<Modal
			title={ options.title || __( 'Are you sure?', 'aponto' ) }
			onRequestClose={ () => settle( false ) }
			className="ap-confirm-modal"
			size="small"
			focusOnMount="firstContentElement"
		>
			<div className="ap-confirm">
				{ options.message ? <p className="ap-confirm-message">{ options.message }</p> : null }
				{ options.prompt ? (
					<textarea
						className="ap-confirm-input"
						aria-label={ options.promptLabel || options.prompt }
						placeholder={ options.promptPlaceholder || '' }
						value={ value }
						rows={ 3 }
						onChange={ ( e ) => setValue( e.target.value ) }
					/>
				) : null }
				<div className="ap-confirm-actions">
					{ /* Cancel first: without a prompt it is the first content element and takes the
					     default focus, so Enter activates Cancel — never an auto-confirm. */ }
					<Button variant="tertiary" onClick={ () => settle( false ) }>
						{ options.cancelText || __( 'Cancel', 'aponto' ) }
					</Button>
					<Button
						variant="primary"
						isDestructive={ Boolean( options.destructive ) }
						onClick={ () => settle( options.prompt ? value : true ) }
					>
						{ options.confirmText || __( 'Confirm', 'aponto' ) }
					</Button>
				</div>
			</div>
		</Modal>
	) : null;

	return { confirm, dialog };
}

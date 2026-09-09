/**
 * Lightweight toast. The mockup toasts often mark a REST boundary or the result
 * of a write (sent/suppressed notify, deleted, saved). One live toast at a time.
 */
import { createContext, useContext, useState, useRef, useCallback } from 'react';

const ToastContext = createContext( () => {} );

export function useToast() {
	return useContext( ToastContext );
}

export function ToastProvider( { children } ) {
	const [ toast, setToast ] = useState( null );
	const timer = useRef( null );

	const showToast = useCallback( ( message, tone = 'default' ) => {
		if ( ! message ) {
			return;
		}
		setToast( { message, tone } );
		if ( timer.current ) {
			clearTimeout( timer.current );
		}
		timer.current = setTimeout( () => setToast( null ), 3200 );
	}, [] );

	return (
		<ToastContext.Provider value={ showToast }>
			{ children }
			<div className={ `ap-toast${ toast ? ' is-visible' : '' }` } role="status" aria-live="polite">
				{ toast ? <span className={ toast.tone === 'danger' ? 'ap-toast-danger' : undefined }>{ toast.message }</span> : null }
			</div>
		</ToastContext.Provider>
	);
}

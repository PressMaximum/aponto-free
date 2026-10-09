/** @jsxImportSource preact */
/**
 * Checkout continuity for a gateway that pays on a checkout of its own (D-R71w).
 *
 * Everything here is inert unless an offered gateway publishes `session_url`
 * (`lib/payments/session.js`): no request, no storage, nothing rendered — a site
 * without such a gateway gets the widget exactly as it was.
 *
 * With one, three things survive the visitor leaving for that checkout and
 * coming back (browser Back, or a second booking into the same cart):
 *
 *  1. a notice that a booking is waiting there, with the way back to it;
 *  2. the identity fields they typed — from this tab's `sessionStorage`
 *     (`lib/hold.js`), else from what the checkout's own session already holds;
 *  3. their own held time, which the slot grid marks instead of dropping.
 *
 * Consent is never restored, and neither is the note or any custom-field answer.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Banner } from './feedback.jsx';
import { recapLine } from './Summary.jsx';
import { COPY, sprintf } from '../lib/copy.js';
import { gatewaySession, sessionGateway } from '../lib/payments/session.js';
import { readContact, storeContact } from '../lib/hold.js';

const CONTACT_FIELDS = [ 'first_name', 'last_name', 'email', 'phone' ];

/**
 * Fill the EMPTY identity fields of the details from a contact; a field the
 * visitor already typed in is never replaced.
 *
 * @param {Object} details Current Details-step values.
 * @param {Object} contact `{first_name, last_name, email, phone}`.
 * @return {Object} The same object when nothing changed, else a copy.
 */
export function fillContact( details, contact ) {
	let next = details;
	CONTACT_FIELDS.forEach( ( field ) => {
		if ( ! details[ field ] && contact && contact[ field ] ) {
			next = next === details ? { ...details } : next;
			next[ field ] = contact[ field ];
		}
	} );
	return next;
}

/**
 * Start instants this visitor already holds for what the Date & time step is showing.
 *
 * Matched by service and — when one person is chosen — by staff, so the mark only
 * appears where that hold is the reason the time is missing.
 *
 * @param {?Object} session Normalised checkout session.
 * @param {?Object} service Selected service.
 * @param {?number} staffId Chosen staff id, or null for "any".
 * @return {Array.<string>} ISO instants.
 */
export function heldStarts( session, service, staffId ) {
	return ( ( session && session.attempts ) || [] )
		.filter(
			( attempt ) =>
				service &&
				attempt.serviceId === service.id &&
				( ! staffId || attempt.staffId === staffId )
		)
		.map( ( attempt ) => attempt.startUtc );
}

/**
 * Ask the checkout what it holds, and keep the identity fields across the trip.
 *
 * @param {Object}         args            Arguments.
 * @param {Array.<Object>} args.gateways   Offered gateways.
 * @param {string}         [args.nonce]    REST nonce.
 * @param {Object}         args.details    Details-step values.
 * @param {Function}       args.setDetails State setter of those values.
 * @return {{session: ?Object, open: boolean, dismiss: Function}} Session and notice state.
 */
export function useCheckoutSession( { gateways, nonce, details, setDetails } ) {
	const capable = !! sessionGateway( gateways );
	const [ session, setSession ] = useState( null );
	const [ dismissed, setDismissed ] = useState( false );
	const stored = useRef( false );
	const had = useRef( false );

	// This tab's own copy first: it is what the visitor typed last.
	useEffect( () => {
		if ( ! capable ) {
			return;
		}
		const contact = readContact();
		stored.current = !! contact;
		if ( contact ) {
			setDetails( ( current ) => fillContact( current, contact ) );
		}
	}, [ capable, setDetails ] );

	// On load, and again when Back restores the page from the back/forward cache.
	useEffect( () => {
		if ( ! capable ) {
			return undefined;
		}
		let live = true;
		const ask = () =>
			gatewaySession( gateways, { nonce } ).then( ( answer ) => {
				if ( ! live ) {
					return;
				}
				setSession( answer );
				setDismissed( false );
				if ( answer && ! stored.current ) {
					setDetails( ( current ) =>
						fillContact( current, answer.contact )
					);
				}
			} );
		const restored = ( event ) => {
			if ( event && event.persisted ) {
				ask();
			}
		};
		ask();
		window.addEventListener( 'pageshow', restored );
		return () => {
			live = false;
			window.removeEventListener( 'pageshow', restored );
		};
	}, [ capable, gateways, nonce, setDetails ] );

	// Remember what is typed; clearing the fields (a finished booking) forgets it.
	const { first_name: first, last_name: last, email, phone } = details;
	useEffect( () => {
		const has = !! ( first || last || email || phone );
		if ( capable && ( has || had.current ) ) {
			storeContact( { first_name: first, last_name: last, email, phone } );
			had.current = has;
		}
	}, [ capable, first, last, email, phone ] );

	return {
		session,
		open: !! session && session.attempts.length > 0 && ! dismissed,
		dismiss: () => setDismissed( true ),
	};
}

/**
 * "You have a booking waiting at checkout" — resume it, or keep booking.
 *
 * @param {Object}   props           Props.
 * @param {Object}   props.session   Normalised checkout session with at least one attempt.
 * @param {string}   props.displayTz Display timezone.
 * @param {string}   [props.locale]  Locale.
 * @param {Function} props.onContinue Keep booking in this form.
 */
export function CheckoutNotice( { session, displayTz, locale, onContinue } ) {
	const first = session.attempts[ 0 ];
	const title =
		session.attempts.length > 1
			? sprintf( COPY.checkout_waiting_many, session.attempts.length )
			: sprintf(
					COPY.checkout_waiting,
					recapLine( {
						service: first.serviceName
							? { name: first.serviceName }
							: null,
						slotUtc: first.startUtc,
						displayTz,
						locale,
					} )
			  );
	return (
		<Banner
			variant="info"
			title={ title }
			body={ session.multiple ? '' : COPY.checkout_change_hint }
		>
			<div class="ap-note-actions">
				<a class="ap-link" href={ session.resumeUrl }>
					{ COPY.checkout_resume }
				</a>
				<button type="button" class="ap-link" onClick={ onContinue }>
					{ session.multiple
						? COPY.checkout_add_another
						: COPY.checkout_change }
				</button>
			</div>
		</Banner>
	);
}

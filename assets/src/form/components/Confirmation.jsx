/** @jsxImportSource preact */
/**
 * Step 4 — Confirmation (SPEC-P1 §2.2 #4).
 *
 * This is a success STATE, not an interactive step: the submit happened from the
 * Details CTA. The panel renders entirely from the original `POST /public/bookings`
 * response — status (pending/confirmed) copy, the `ORDER #AP-XXXXX` chip, and the
 * Add-to-Calendar targets bound from that response (the `.ics` URL verbatim, the
 * Google URL built from the response's UTC times). The friendly `City (GMT±N)`
 * label is shown (D1). Pending copy points the visitor to their email.
 *
 * Idempotent replay (`links_available:false`): the calendar buttons drop and the
 * panel says the manage link + calendar file were already emailed (SPEC-P0 §5.6).
 */
import { __ } from '@wordpress/i18n';
import { useRef, useEffect } from 'preact/hooks';
import { tzLabel, formatInTz, fmtTime } from '../lib/tz.js';
import { IconCheck, IconCalendar, IconDownload, IconPrinter } from './icons.jsx';
import { Banner } from './feedback.jsx';
import { COPY, sprintf } from '../lib/copy.js';
import { gatewayPaidLineCopy } from '../lib/payments.js';

/** ISO instant -> `YYYYMMDDTHHMMSSZ` for calendar URLs. */
function icsStamp( iso ) {
	return new Date( iso )
		.toISOString()
		.replace( /[-:]/g, '' )
		.replace( /\.\d{3}Z$/, 'Z' );
}

/** Build a Google Calendar "add event" URL from the original response data. */
function googleUrl( booking, businessName ) {
	const title = booking.service && booking.service.name ? booking.service.name : __( 'Appointment', 'aponto' );
	const text = businessName ? title + ' — ' + businessName : title;
	const dates = icsStamp( booking.start_utc ) + '/' + icsStamp( booking.end_utc );
	const params = [
		'action=TEMPLATE',
		'text=' + encodeURIComponent( text ),
		'dates=' + dates,
	];
	if ( businessName ) {
		params.push( 'location=' + encodeURIComponent( businessName ) );
	}
	return 'https://calendar.google.com/calendar/render?' + params.join( '&' );
}

/**
 * The one line the payment adds to an otherwise unchanged panel (D-R38).
 *
 * The AMOUNT is the client's own formatted total, not something the server sent:
 * the confirm route answers with state only — no PII, no links, no amount — so
 * the figure shown here is the same one the summary has been showing all along.
 *
 * @param {Object} props         Props.
 * @param {Object} props.payment `{status, amountLabel, orderCode, method}` or null.
 * @return {?Object} The line, or null when the booking took no online payment.
 */
export function PaymentLine( { payment } ) {
	if ( ! payment ) {
		return null;
	}
	if ( payment.status === 'paid' ) {
		return (
			<p class="ap-paid-line">
				{ payment.amountLabel
					? sprintf(
							gatewayPaidLineCopy( payment.method ),
							payment.amountLabel,
							payment.orderCode
					  )
					: // A return leg has no amount to quote: `sessionStorage`
					  // carries no money figure (F5) and `/confirm` never sends
					  // one. Naming the reference is better than inventing a sum.
					  sprintf( COPY.pay_paid_line_plain, payment.orderCode ) }
			</p>
		);
	}
	if ( payment.status === 'pending' ) {
		return <p class="ap-paid-line">{ COPY.pay_pending_line }</p>;
	}
	if ( payment.status === 'unverified' ) {
		// The money went through; the AMOUNT is what could not be confirmed
		// (rest-contract §3.8). No retry is offered anywhere on this panel, and
		// the sentence says who to talk to instead.
		return (
			<p class="ap-paid-line">{ COPY.pay_fail_unverified_amount }</p>
		);
	}
	return null;
}

export function Confirmation( {
	response,
	displayTz,
	locale,
	businessName,
	payment = null,
	focusOnMount = true,
	onBookAnother,
} ) {
	const booking = response.booking;
	const confirmed = booking.status === 'confirmed';
	const linksAvailable = response.links_available !== false;
	const headingRef = useRef( null );

	useEffect( () => {
		if ( focusOnMount && headingRef.current ) {
			headingRef.current.focus();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	return (
		<div class="ap-step">
			<div class="ap-done">
				<div class="ap-check">
					<IconCheck />
				</div>
				<h2 ref={ headingRef } tabIndex={ -1 }>
					{ confirmed
						? COPY.confirm_confirmed_title
						: COPY.confirm_pending_title }
				</h2>
				<p class="lead">
					{ confirmed
						? COPY.confirm_confirmed_lead
						: COPY.confirm_pending_lead }
				</p>
				<p class="tz">{ tzLabel( displayTz, booking.start_utc ) }</p>
				<span class="ap-order">
					{ COPY.order_label }{ ' ' }
					<span class="ap-order-code">
						#{ booking.order && booking.order.code }
					</span>
				</span>
				<PaymentLine payment={ payment } />
			</div>

			<div class="ap-conf-card">
				<div class="ap-tile">
					<div class="d">{ formatInTz( booking.start_utc, displayTz, { day: 'numeric' }, locale ) }</div>
					<div class="m">{ formatInTz( booking.start_utc, displayTz, { month: 'short' }, locale ) }</div>
				</div>
				<div class="info">
					<span class="ap-item-title">
						{ booking.service && booking.service.name }
					</span>
					<small>
						{ formatInTz(
							booking.start_utc,
							displayTz,
							{ weekday: 'short', month: 'short', day: 'numeric' },
							locale
						) }{ ' ' }
						· { fmtTime( booking.start_utc, displayTz, locale ) } →{ ' ' }
						{ fmtTime( booking.end_utc, displayTz, locale ) }
					</small>
					<small class="tz">{ tzLabel( displayTz, booking.start_utc ) }</small>
				</div>
			</div>

			{ linksAvailable ? (
				<div>
					<div class="ap-cal-tiles">
						<a
							class="ap-cal-tile"
							href={ googleUrl( booking, businessName ) }
							target="_blank"
							rel="noopener noreferrer"
						>
							<IconCalendar />
							{ COPY.cal_google }
						</a>
						{ response.ics_url && (
							<a
								class="ap-cal-tile"
								href={ response.ics_url }
							>
								<IconDownload />
								{ COPY.cal_ics }
							</a>
						) }
						<button
							type="button"
							class="ap-cal-tile"
							onClick={ () => window.print() }
						>
							<IconPrinter />
							{ COPY.print }
						</button>
					</div>
					{ ! confirmed && (
						<Banner variant="info" body={ COPY.confirm_manage_hint } />
					) }
				</div>
			) : (
				<div class="ap-links-emailed">
					<Banner variant="info" body={ COPY.replay_body } />
				</div>
			) }

			{ /* Account nudge deliberately absent: the v4 README's V1 gating list
			     hides it ("the account nudge is hidden") — a COMING SOON promo for
			     an unbuilt feature is roadmap noise (same rule as phase badges). */ }
			<div class="ap-conf-actions">
				<button type="button" onClick={ onBookAnother }>
					{ COPY.book_another }
				</button>
			</div>
		</div>
	);
}

/**
 * The panel a gateway RETURN leg lands on when the widget has no stored copy of
 * the original booking response.
 *
 * Reachable only through a redirect-based method (V1 pins `allow_redirects:
 * never`, so it should not happen) combined with a browser that lost its session
 * storage — a private window, a different tab, a cleared store. There is nothing
 * honest to render but the state the confirm leg reported and the fact that the
 * manage link is already in the customer's inbox, which is exactly what this
 * says.
 *
 * @param {Object}   props              Props.
 * @param {boolean}  props.confirmed    Whether the booking came back confirmed.
 * @param {?Object}  props.payment      Payment line data.
 * @param {boolean}  props.focusOnMount Focus the heading.
 * @param {Function} props.onBookAnother Restart the flow.
 */
export function MinimalConfirmation( {
	confirmed,
	// The WHITELISTED display facts (F5): service, staff, start/end and the
	// display timezone. Enough to recognise the appointment, and not one field
	// that grants access to it.
	details = null,
	locale,
	payment = null,
	focusOnMount = true,
	onBookAnother,
} ) {
	const headingRef = useRef( null );

	useEffect( () => {
		if ( focusOnMount && headingRef.current ) {
			headingRef.current.focus();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	return (
		<div class="ap-step">
			<div class="ap-done">
				<div class="ap-check">
					<IconCheck />
				</div>
				<h2 ref={ headingRef } tabIndex={ -1 }>
					{ confirmed
						? COPY.confirm_confirmed_title
						: COPY.confirm_pending_title }
				</h2>
				<p class="lead">{ COPY.pay_minimal_lead }</p>
				{ details && details.start_utc ? (
					<p class="tz">
						{ details.service_name ? details.service_name + ' · ' : '' }
						{ formatInTz(
							details.start_utc,
							details.display_tz,
							{ weekday: 'short', month: 'short', day: 'numeric' },
							locale
						) }{ ' ' }
						· { fmtTime( details.start_utc, details.display_tz, locale ) }
						{ details.end_utc
							? ' → ' +
							  fmtTime( details.end_utc, details.display_tz, locale )
							: '' }
					</p>
				) : null }
				{ payment && payment.orderCode ? (
					<span class="ap-order">
						{ COPY.order_label }{ ' ' }
						<span class="ap-order-code">#{ payment.orderCode }</span>
					</span>
				) : null }
				<PaymentLine payment={ payment } />
			</div>
			<div class="ap-conf-actions">
				<button type="button" onClick={ onBookAnother }>
					{ COPY.book_another }
				</button>
			</div>
		</div>
	);
}

/**
 * The "payment not completed" panel.
 *
 * Shown when a payment ends in any state that is neither paid nor processing —
 * an abandoned redirect, or a confirm leg that came back `failed`/`expired`. The
 * slot is still held, so the deadline is the most useful thing on the panel and
 * "try again" is the primary action; nothing has been charged, and the copy says
 * so rather than leaving the customer to guess.
 *
 * @param {Object}    props               Props.
 * @param {?string}   props.deadlineLabel Local time the hold ends, if known.
 * @param {?string}   props.orderCode     Order code, if known.
 * @param {boolean}   props.released      Whether the hold is already gone.
 * @param {?Function} props.onRetry       Return to the Payment step (in-widget only).
 * @param {Function}  props.onBookAnother Restart the flow.
 * @param {boolean}   props.focusOnMount  Focus the heading.
 */
export function PaymentIncomplete( {
	deadlineLabel,
	orderCode,
	// The customer-safe sentence for a decline reason, when the server gave one
	// (rest-contract §3.8). "It did not work" is not an answer a customer can act
	// on; "your card was declined" is.
	failureCopy = '',
	// The hold is GONE — the server refused to capture against a slot it had
	// already given back (`hold_released`). The banner must not then quote a
	// deadline for it: there is nothing left to be held until.
	released = false,
	onRetry,
	onBookAnother,
	focusOnMount = true,
} ) {
	const headingRef = useRef( null );

	useEffect( () => {
		if ( focusOnMount && headingRef.current ) {
			headingRef.current.focus();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	let holdLine = COPY.pay_hold_generic;
	if ( released ) {
		holdLine = COPY.pay_hold_released;
	} else if ( deadlineLabel ) {
		holdLine = sprintf( COPY.pay_hold_until, deadlineLabel );
	}

	return (
		<div class="ap-step">
			<div class="ap-done">
				<h2 ref={ headingRef } tabIndex={ -1 }>
					{ COPY.pay_incomplete_title }
				</h2>
				<p class="lead">{ failureCopy || COPY.pay_incomplete_lead }</p>
				{ orderCode ? (
					<span class="ap-order">
						{ COPY.order_label }{ ' ' }
						<span class="ap-order-code">#{ orderCode }</span>
					</span>
				) : null }
			</div>
			<Banner variant="clock" body={ holdLine } />
			<div class="ap-conf-actions">
				{ onRetry ? (
					<button type="button" class="ap-primary" onClick={ onRetry }>
						{ COPY.try_again }
					</button>
				) : null }
				<button type="button" onClick={ onBookAnother }>
					{ COPY.book_another }
				</button>
			</div>
		</div>
	);
}

/**
 * A resume link that no longer leads anywhere payable.
 *
 * The cases lead somewhere DIFFERENT, which is the whole reason the refusal
 * carries the order's real payment status: "you have already paid" ends the
 * story, "that hold expired" needs a way back to the form. Anything else — a
 * dead token, a gateway switched off since — falls in with the expired case,
 * because "book again" is the only honest advice left.
 *
 * `busy` is the one that is NOT terminal (D-R39c round 2, Codex NEW-4): the
 * server answered `503` for longer than the widget's bounded retry, meaning
 * another writer holds this order for the moment. The hold is alive, so the only
 * correct action is the one this state offers — try the same link again. Showing
 * the expired copy here told a customer with a live slot that they had lost it,
 * and the token was already stripped from the URL, so the lie was also the end
 * of the road.
 *
 * @param {Object}   props              Props.
 * @param {boolean}  props.paid         Whether the order is already settled.
 * @param {boolean}  props.busy         Whether the refusal was a temporary lock timeout.
 * @param {Function} props.onRetry      Re-send the resume request.
 * @param {string}   props.bookAgainUrl Clean booking-page URL, or ''.
 * @param {boolean}  props.focusOnMount Focus the heading.
 */
export function ResumeUnavailable( {
	paid,
	busy = false,
	onRetry = null,
	bookAgainUrl,
	focusOnMount = true,
} ) {
	const headingRef = useRef( null );

	useEffect( () => {
		if ( focusOnMount && headingRef.current ) {
			headingRef.current.focus();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	let title = COPY.resume_gone_title;
	let lead = COPY.resume_gone_lead;
	if ( busy ) {
		title = COPY.resume_busy_title;
		lead = COPY.resume_busy_lead;
	} else if ( paid ) {
		title = COPY.resume_paid_title;
		lead = COPY.resume_paid_lead;
	}

	return (
		<div class="ap-step">
			<div class="ap-done">
				<h2 ref={ headingRef } tabIndex={ -1 }>
					{ title }
				</h2>
				<p class="lead">{ lead }</p>
			</div>
			{ busy && onRetry ? (
				<div class="ap-conf-actions">
					<button type="button" class="ap-primary" onClick={ onRetry }>
						{ COPY.try_again }
					</button>
				</div>
			) : null }
			{ ! busy && ! paid && bookAgainUrl ? (
				<div class="ap-conf-actions">
					<a class="ap-btn" href={ bookAgainUrl }>
						{ COPY.resume_book_again }
					</a>
				</div>
			) : null }
		</div>
	);
}

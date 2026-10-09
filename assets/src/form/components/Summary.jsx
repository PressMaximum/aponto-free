/** @jsxImportSource preact */
/**
 * Booking summary — ONE renderer, TWO placements. The ≥700px container gets it as
 * the `.ap-aside` sidebar column; below 700px the same element is the body of the
 * in-flow recap accordion (SPEC-P1 §2.1, `docs/mockups/v4/booking-form/`
 * `summaryBodyHTML()`). Because both placements mount this same component, a
 * selection can never appear on one surface but not the other.
 *
 * Structure mirrors the reference so the sidebar can scroll its item area while
 * the cost/total block stays pinned to the bottom of the column:
 *
 *   .ap-summary-body
 *     .ap-sum-scroll   ← the item area; `overflow-y:auto` inside `.ap-aside`
 *     .ap-sum-sec      ← total/price; `margin-top:auto` inside `.ap-aside`
 *
 * The heading ("Your booking") is NOT rendered here: the sidebar supplies it as
 * the landmark's accessible name, and the accordion is already labelled by its
 * own disclosure button. Rendering it inside the body would duplicate it in the
 * accordion.
 *
 * Since D-R49 the sidebar is on from the Service step by default, where nothing
 * is picked yet: `service` may be null, and the body is then the v4 compact
 * screen's empty state. It is plain static text — not a live region, nothing
 * focusable — so mounting it announces nothing and moves no focus; the step
 * heading keeps both. Picking a service swaps in the regular body.
 *
 * V1 gating (REVIEW.md §2 item 5): no cart, so no item count, no "Add service",
 * no location line and no payments/credits line — just the single current booking.
 * AMENDED by D-R50: a SPECIALIST line appears under the service name, and only when the
 * customer picked a named staff member on the new Staff step. Both placements get it
 * from this one renderer, so the sidebar and the recap accordion can never disagree.
 * AMENDED by D-R62: a "Where: <location>" line (address beneath it) appears whenever a location
 * is in play — chosen on the Location step, assigned silently because the service is offered at
 * one place, or preset by the block — from the same one renderer. The v4 "no location line"
 * gating above was about the cart-era summary; a booking that is going to a specific branch owes
 * the customer the branch.
 *
 * Every time flows through the one `tz.js` formatter in the active display_tz, so
 * the summary is byte-consistent with the slot picker and confirmation (D1). The
 * studio time appears as a labelled secondary line whenever the zones differ.
 */
import { DepositLines } from './DepositLines.jsx';
import { fmtTime, formatInTz } from '../lib/tz.js';
import { formatMoney, isFreePrice } from '../lib/format.js';
import { COPY, sprintf } from '../lib/copy.js';
import { telHref } from '../lib/config.js';
import { BookingSummaryDetails } from './BookingSummaryDetails.jsx';

// The row components live with the summary details; re-exported for the intro panel (D-R80).
export {
	spokenLabel,
	SumLocation,
	SumStaff,
	SumWhen,
} from './BookingSummaryDetails.jsx';

/**
 * "Questions? Call +84 …" at the foot of the summary (founder review 2026-09-30). The number
 * is the business's own public phone (or the chosen branch's); nothing renders without one.
 *
 * @param {Object}  props       Props.
 * @param {string}  props.phone Display phone.
 * @param {string}  props.title Heading override from the block, '' for the default.
 * @param {?string} props.id    Element id, for a disclosure that controls it (D-R80).
 * @return {?Object} Block.
 */
export function ContactHelp( { phone, title, id } ) {
	const href = telHref( phone );
	// A value with no number in it prints NOTHING (persona QA 2026-10-05, T-088): "Call abc not
	// a phone for help" is worse than no line.
	if ( ! phone || ! href ) {
		return null;
	}
	// Split the translated sentence around the number so it can be a link wherever the
	// language puts it.
	const parts = sprintf( COPY.contact_call, '\u0000' ).split( '\u0000' );
	return (
		<div class="ap-sum-help" id={ id }>
			<p class="t">{ title || COPY.contact_title }</p>
			<p class="c">
				{ parts[ 0 ] }
				<a href={ href }>{ phone }</a>
				{ parts[ 1 ] || '' }
			</p>
		</div>
	);
}

/** One-line recap for the collapsed mobile bar. */
export function recapLine( { service, slotUtc, displayTz, locale } ) {
	if ( ! slotUtc ) {
		return service ? service.name : '';
	}
	const when = formatInTz(
		slotUtc,
		displayTz,
		{ month: 'short', day: 'numeric' },
		locale
	);
	return (
		( service ? service.name + ' · ' : '' ) +
		when +
		', ' +
		fmtTime( slotUtc, displayTz, locale )
	);
}

/**
 * The recap bar's line as TWO parts (QA D05, 2026-10-05): the service name, which may ellipsize,
 * and the chosen time, which never does — a long service name used to truncate the one thing the
 * bar exists to show. The time part starts with a non-breaking space so the separator survives
 * the flex layout.
 *
 * @param {Object} props Same as {@link recapLine}.
 * @return {Object} Line.
 */
export function RecapLine( { service, slotUtc, displayTz, locale } ) {
	const name = service ? service.name : '';
	if ( ! slotUtc ) {
		return (
			<span class="ap-recap-line">
				<span class="ap-recap-name">{ name }</span>
			</span>
		);
	}
	const when =
		formatInTz( slotUtc, displayTz, { month: 'short', day: 'numeric' }, locale ) +
		', ' +
		fmtTime( slotUtc, displayTz, locale );
	return (
		<span class="ap-recap-line">
			{ name ? <span class="ap-recap-name">{ name }</span> : null }
			<span class="ap-recap-when">
				{ ( name ? '\u00a0· ' : '' ) + when }
			</span>
		</span>
	);
}

/**
 * The price section: edition adjustment rows (`@aponto/form-coupons`) above the total. Nothing
 * for an unpriced service or a free one (D-R81).
 *
 * @param {Object}    props                  Props.
 * @param {Object}    props.service          Service DTO.
 * @param {string}    props.locale           Locale.
 * @param {?number}   props.currencyExponent Server ISO exponent (D-R39a).
 * @param {?Function} props.priceRows        Edition adjustment renderer, or null.
 * @param {?number}   props.totalMinor       Server-quoted total, or null for the list price.
 * @param {string}    props.totalNote        The paying gateway's own line under the total
 *                                           (T-025), '' for none.
 * @param {?Object}   props.paymentTerms     Server payment terms; a deposit order adds the
 *                                           "due now / balance later" lines (D-R71).
 * @return {?Object} Section.
 */
export function SumTotal( {
	service,
	locale,
	currencyExponent,
	priceRows,
	totalMinor,
	totalNote = '',
	paymentTerms = null,
} ) {
	const price = formatMoney(
		service.price_minor,
		service.currency,
		locale,
		currencyExponent
	);
	// A free service (D-R81) has no sum to show: the meta line already says "Free". A coupon
	// that brings a POSITIVE price to 0 still lands here with its rows and a 0 total, so the
	// discount stays explained.
	if ( ! price || isFreePrice( service.price_minor ) ) {
		return null;
	}
	const total =
		totalMinor === null
			? price
			: formatMoney( totalMinor, service.currency, locale, currencyExponent );
	return (
		<div class="ap-sum-sec">
			{ priceRows ? priceRows( { service, locale, currencyExponent } ) : null }
			<div class="ap-sum-total">
				<span>{ COPY.summary_total }</span>
				<span class="v">{ total }</span>
			</div>
			{ totalNote ? <p class="ap-sum-biz">{ totalNote }</p> : null }
			<DepositLines
				order={ paymentTerms }
				currency={ service.currency }
				locale={ locale }
				currencyExponent={ currencyExponent }
			/>
		</div>
	);
}

/**
 * The gateway whose own pricing governs the total the summary shows, or null (persona QA
 * 2026-10-05, T-025 re-test).
 *
 * That is the gateway this booking WILL be paid through: the site's only way to pay (online
 * payment required and exactly one method offered), or the method the visitor picked on the
 * Payment step. With several methods and none picked yet nothing is known, so nothing is said.
 * The caller reads that gateway's own copy (`totalNote`); this file names no gateway.
 *
 * @param {Object}  args           Arguments.
 * @param {string}  args.mode      Site payment mode (`off` / `optional` / `required`).
 * @param {number}  args.offered   How many methods the site offers, drawable or not.
 * @param {Array}   args.gateways  The methods this bundle can draw.
 * @param {?string} args.payMethod The method picked on the Payment step, if any.
 * @return {?Object} Gateway entry.
 */
export function totalNoteGateway( { mode, offered, gateways, payMethod } ) {
	const list = gateways || [];
	if ( mode === 'required' && offered === 1 && list.length === 1 ) {
		return list[ 0 ];
	}
	return list.find( ( gateway ) => gateway.code === payMethod ) || null;
}

/** The heading both placements agree on (sidebar label / accordion fallback). */
export const SUMMARY_HEADING_ID = 'ap-summary-heading';

export function Summary( {
	service,
	// The chosen staff member's NAME, or '' for "Any available" and for every site that does
	// not offer the choice (D-R50). A name is shown only when the customer actually named
	// somebody: "With: Any available" would be noise, and on a single-staff or Free site the
	// summary must read exactly as it did before this feature existed.
	staffName = '',
	// The named staff member's job title (D-R51), appended after the name on the same line as
	// "With: Bella Nguyen · Color Specialist". Empty on every site that has not filled it in,
	// which keeps the Free and single-staff output byte-identical to D-R50's.
	staffTitle = '',
	// "Any available" was the visitor's answer on the Staff step (founder review 2026-09-30),
	// and the term the business uses for its staff, for the detail line under it.
	staffAny = false,
	staffTerm = '',
	// The contact-help line: phone ('' = none) and the block's heading override.
	contactPhone = '',
	contactText = '',
	// The location this booking is going to, or '' on every site with no location roster
	// (D-R62) — whose summary therefore reads exactly as it did before.
	locationName = '',
	// Its one-line address; '' leaves the line out rather than printing an empty one.
	locationAddress = '',
	locale,
	// The site currency's ISO exponent, from the server: `Intl`'s digit table
	// disagrees with ISO for at least one live currency, and the price was
	// stored against ISO (D-R39a).
	currencyExponent = null,
	displayTz,
	businessTz,
	slotUtc,
	// Edition-owned order adjustments (`@aponto/form-coupons`): an optional
	// renderer for the lines between the item and the total, and the total the
	// server quoted. Both absent in Free, where the total is the service price.
	priceRows = null,
	totalMinor = null,
	paymentTerms = null,
	// One short line under the total when the paying gateway adds something to it at its own
	// checkout (taxes); '' — every Free site, and every gateway that charges this total — prints
	// nothing, so the summary is unchanged there.
	totalNote = '',
} ) {
	if ( ! service ) {
		return (
			<div class="ap-summary-body">
				<p class="ap-sum-start">{ COPY.summary_empty_title }</p>
				<p class="ap-sum-empty">{ COPY.summary_empty_text }</p>
				<ContactHelp phone={ contactPhone } title={ contactText } />
			</div>
		);
	}

	return (
		<div class="ap-summary-body">
			<BookingSummaryDetails
				{ ...{
					service,
					staffName,
					staffTitle,
					staffAny,
					staffTerm,
					locationName,
					locationAddress,
					locale,
					currencyExponent,
					displayTz,
					businessTz,
					slotUtc,
				} }
			/>

			<SumTotal
				service={ service }
				locale={ locale }
				currencyExponent={ currencyExponent }
				priceRows={ priceRows }
				totalMinor={ totalMinor }
				totalNote={ totalNote }
				paymentTerms={ paymentTerms }
			/>
			<ContactHelp phone={ contactPhone } title={ contactText } />
		</div>
	);
}

/** @jsxImportSource preact */
/**
 * The booking facts of the form's summary: service, duration and price, where, with whom, when.
 *
 * Each row is its own component so the one-page intro panel (D-R80) prints the SAME rows from
 * the same code rather than a second copy of the formatting: a location, a staff member and an
 * appointment time can then never read differently in the sidebar, the intro or a checkout
 * notice. Each renders nothing when it has nothing to say.
 */
import {
	endsNextDay,
	fmtTime,
	fmtTimeAt,
	formatInTz,
	tzLabel,
} from '../lib/tz.js';
import { formatDuration, formatPrice } from '../lib/format.js';
import { COPY, sprintf } from '../lib/copy.js';
import { IconCalendar, IconPin, IconUser } from './icons.jsx';

/**
 * The spoken "Where: " / "With: " prefix of a summary row. The row itself shows an icon
 * instead (founder review 2026-09-30: inline "Where:" labels read as a form dump), so the
 * words ride a visually-hidden span and the row still reads "Where: Downtown" aloud.
 *
 * @param {string} label The row label, e.g. COPY.summary_where.
 * @return {Object} Hidden prefix.
 */
export function spokenLabel( label ) {
	return (
		<span class="ap-visually-hidden">
			{ sprintf( COPY.summary_line, label, '' ) }
		</span>
	);
}

/** end instant = start + service duration. */
function endInstant( slotUtc, durationMinutes ) {
	return new Date(
		new Date( slotUtc ).getTime() + ( durationMinutes || 0 ) * 60000
	).toISOString();
}

/**
 * "Where: <location>" with its address beneath (D-R62).
 *
 * @param {Object} props         Props.
 * @param {string} props.name    Location name, '' for none.
 * @param {string} props.address One-line address, '' for none.
 * @return {?Object} Row.
 */
export function SumLocation( { name, address } ) {
	if ( ! name ) {
		return null;
	}
	// Icon rows: the name in full text colour, its detail (address, job title, time range)
	// underneath in the muted tone.
	return (
		<div class="ap-sum-item">
			<IconPin />
			<p class="ap-sum-sub">
				{ spokenLabel( COPY.summary_where ) }
				<span class="k">{ name }</span>
				{ address ? <br /> : null }
				{ address || null }
			</p>
		</div>
	);
}

/**
 * "With: <staff member>" (D-R50/D-R51), or "With: Any available" when that was the answer.
 *
 * @param {Object}  props       Props.
 * @param {string}  props.name  Named staff member, '' for none.
 * @param {string}  props.title Their job title, '' for none.
 * @param {boolean} props.any   The visitor answered "Any available".
 * @param {string}  props.term  The business's word for its staff.
 * @return {?Object} Row.
 */
export function SumStaff( { name, title, any, term } ) {
	if ( name ) {
		return (
			<div class="ap-sum-item">
				<IconUser />
				<p class="ap-sum-sub">
					{ spokenLabel( COPY.summary_with ) }
					<span class="k">{ name }</span>
					{ title ? <br /> : null }
					{ title || null }
				</p>
			</div>
		);
	}
	if ( ! any ) {
		return null;
	}
	return (
		<div class="ap-sum-item">
			<IconUser />
			<p class="ap-sum-sub">
				{ spokenLabel( COPY.summary_with ) }
				<span class="k">{ COPY.staff_any }</span>
				<br />
				{ sprintf( COPY.staff_any_sub_short, term ) }
			</p>
		</div>
	);
}

/**
 * The chosen appointment: day, start → end (with "+1 day" when it ends tomorrow, T-058), the
 * display zone, and the business's own time — with the business DATE when it is not the
 * customer's (T-058, T-059) — when the zones differ (D1). Every time goes through `tz.js`.
 *
 * @param {Object}  props                 Props.
 * @param {?string} props.slotUtc         Chosen slot, null for none.
 * @param {number}  props.durationMinutes Service duration.
 * @param {string}  props.displayTz       Display zone.
 * @param {string}  props.businessTz      Business zone.
 * @param {string}  props.locale          Locale.
 * @param {?string} props.spoken          Spoken label before the time ("Your time"), or none.
 * @param {*}       props.children        Extra content under the zone lines (the intro's
 *                                        "Change time", D-R80), or none.
 * @return {?Object} Row.
 */
export function SumWhen( {
	slotUtc,
	durationMinutes,
	displayTz,
	businessTz,
	locale,
	spoken = '',
	children = null,
} ) {
	if ( ! slotUtc ) {
		return null;
	}
	const endUtc = endInstant( slotUtc, durationMinutes );
	return (
		<div class="ap-sum-item">
			<IconCalendar />
			<div class="ap-sum-when">
				{ spoken ? spokenLabel( spoken ) : null }
				<div class="ap-line when">
					<span class="l">
						{ formatInTz(
							slotUtc,
							displayTz,
							{
								weekday: 'short',
								month: 'short',
								day: 'numeric',
							},
							locale
						) }
					</span>
					<span class="d" />
					<span class="v">
						{ fmtTime( slotUtc, displayTz, locale ) } →{ ' ' }
						{ endsNextDay( slotUtc, endUtc, displayTz )
							? sprintf(
									COPY.time_next_day,
									fmtTime( endUtc, displayTz, locale )
							  )
							: fmtTime( endUtc, displayTz, locale ) }
					</span>
				</div>
				<p class="ap-sum-biz">{ tzLabel( displayTz, slotUtc ) }</p>
				{ displayTz !== businessTz && (
					<p class="ap-sum-biz">
						{ COPY.summary_business_time }:{ ' ' }
						{ fmtTimeAt( slotUtc, businessTz, displayTz, locale ) } ·{ ' ' }
						{ tzLabel( businessTz, slotUtc ) }
					</p>
				) }
				{ children }
			</div>
		</div>
	);
}

export function BookingSummaryDetails( {
	service,
	staffName = '',
	staffTitle = '',
	// "Any available" was the visitor's answer on the Staff step (founder review 2026-09-30),
	// and the term the business uses for its staff, for the detail line under it.
	staffAny = false,
	staffTerm = '',
	locationName = '',
	locationAddress = '',
	locale,
	currencyExponent = null,
	displayTz,
	businessTz,
	slotUtc,
} ) {
	// "Free" for a price of exactly 0 (D-R81), the money otherwise, nothing when unpriced.
	const price = formatPrice(
		service.price_minor,
		service.currency,
		locale,
		currencyExponent
	);
	return (
		<div class="ap-sum-scroll">
			<p class="ap-sum-svc">{ service.name }</p>
			<p class="ap-sum-sub">
				{ formatDuration( service.duration_minutes, locale ) }
				{ price ? ' · ' + price : '' }
			</p>
			<SumLocation name={ locationName } address={ locationAddress } />
			<SumStaff
				name={ staffName }
				title={ staffTitle }
				any={ staffAny }
				term={ staffTerm }
			/>
			<SumWhen
				slotUtc={ slotUtc }
				durationMinutes={ service.duration_minutes }
				displayTz={ displayTz }
				businessTz={ businessTz }
				locale={ locale }
			/>
		</div>
	);
}

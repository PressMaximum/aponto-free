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
 * V1 gating (REVIEW.md §2 item 5): no cart, so no item count, no "Add service",
 * no specialist/location lines and no payments/credits line — just the single
 * current booking.
 *
 * Every time flows through the one `tz.js` formatter in the active display_tz, so
 * the summary is byte-consistent with the slot picker and confirmation (D1). The
 * studio time appears as a labelled secondary line whenever the zones differ.
 */
import { fmtTime, formatInTz, tzLabel } from '../lib/tz.js';
import { formatDuration, formatMoney } from '../lib/format.js';
import { COPY } from '../lib/copy.js';

/** end instant = start + service duration. */
function endInstant( slotUtc, durationMinutes ) {
	return new Date(
		new Date( slotUtc ).getTime() + ( durationMinutes || 0 ) * 60000
	).toISOString();
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

/** The heading both placements agree on (sidebar label / accordion fallback). */
export const SUMMARY_HEADING_ID = 'ap-summary-heading';

export function Summary( {
	service,
	locale,
	// The site currency's ISO exponent, from the server: `Intl`'s digit table
	// disagrees with ISO for at least one live currency, and the price was
	// stored against ISO (D-R39a).
	currencyExponent = null,
	displayTz,
	businessTz,
	slotUtc,
} ) {
	const price = formatMoney(
		service.price_minor,
		service.currency,
		locale,
		currencyExponent
	);
	const endUtc = slotUtc
		? endInstant( slotUtc, service.duration_minutes )
		: null;

	return (
		<div class="ap-summary-body">
			<div class="ap-sum-scroll">
				<p class="ap-sum-svc">{ service.name }</p>
				<p class="ap-sum-sub">
					{ formatDuration( service.duration_minutes, locale ) }
					{ price ? ' · ' + price : '' }
				</p>

				{ slotUtc ? (
					<div>
						<div class="ap-line">
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
								{ fmtTime( endUtc, displayTz, locale ) }
							</span>
						</div>
						<p class="ap-sum-biz">{ tzLabel( displayTz, slotUtc ) }</p>
						{ displayTz !== businessTz && (
							<p class="ap-sum-biz">
								{ COPY.summary_studio }: { fmtTime( slotUtc, businessTz, locale ) } ·{ ' ' }
								{ tzLabel( businessTz, slotUtc ) }
							</p>
						) }
					</div>
				) : (
					<p class="ap-sum-empty">{ COPY.datetime_sub }</p>
				) }
			</div>

			{ price && (
				<div class="ap-sum-sec">
					<div class="ap-sum-total">
						<span>{ COPY.summary_total }</span>
						<span class="v">{ price }</span>
					</div>
				</div>
			) }
		</div>
	);
}

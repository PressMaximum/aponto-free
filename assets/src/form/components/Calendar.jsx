/** @jsxImportSource preact */
/**
 * Month calendar — bare numbers with 1-letter weekdays, per-day availability bars
 * (accent fill ∝ open slots), a today dot and a solid selected day (design §3).
 * Month and year are native selects the same height as Prev/Next so distant dates
 * don't need repeated arrow clicks. No auto-select.
 *
 * Days are addressed by their `YYYY-MM-DD` key IN THE DISPLAY TIMEZONE — the
 * availability index is grouped the same way (SPEC-P1 §2.2), so at a month
 * boundary a far-ahead visitor sees the studio's slots on the correct local day.
 * Weekday/among-month math is done in UTC so it never drifts with the runtime zone.
 */
import { __ } from '@wordpress/i18n';
import { IconChevronLeft, IconChevronRight } from './icons.jsx';
import { COPY } from '../lib/copy.js';

// Month names + weekday initials are derived from `Intl` in the active locale
// (i18n, SPEC-P1 §5) rather than hardcoded English, so they follow the site
// locale without a per-name translation string. Time zone is pinned to UTC so
// the label math never drifts with the runtime zone.
function monthNames( locale ) {
	const fmt = new Intl.DateTimeFormat( locale || undefined, { month: 'long', timeZone: 'UTC' } );
	return Array.from( { length: 12 }, ( _, m ) => fmt.format( Date.UTC( 2021, m, 15 ) ) );
}
function weekdayInitials( locale ) {
	// 2021-03-01 is a Monday; the grid is Monday-first.
	const fmt = new Intl.DateTimeFormat( locale || undefined, { weekday: 'narrow', timeZone: 'UTC' } );
	return Array.from( { length: 7 }, ( _, i ) => fmt.format( Date.UTC( 2021, 2, 1 + i ) ) );
}

function pad2( n ) {
	return n < 10 ? '0' + n : '' + n;
}

function dayKey( year, month, day ) {
	return year + '-' + pad2( month + 1 ) + '-' + pad2( day );
}

export function Calendar( {
	year,
	month,
	locale,
	todayKey,
	availabilityIndex,
	selectedDayKey,
	maxSlots,
	years,
	onSelectDay,
	onMonth,
} ) {
	const months = monthNames( locale );
	const dow = weekdayInitials( locale );
	const firstDow = ( new Date( Date.UTC( year, month, 1 ) ).getUTCDay() + 6 ) % 7;
	const daysInMonth = new Date( Date.UTC( year, month + 1, 0 ) ).getUTCDate();
	const density = Math.max( 1, maxSlots || 1 );

	const cells = [];
	for ( let i = 0; i < firstDow; i++ ) {
		cells.push( <span key={ 'e' + i } /> );
	}
	for ( let d = 1; d <= daysInMonth; d++ ) {
		const key = dayKey( year, month, d );
		const count = ( availabilityIndex[ key ] || [] ).length;
		const past = key < todayKey;
		const disabled = past || count === 0;
		const selected = key === selectedDayKey;
		const barWidth = Math.min( 100, Math.round( ( count / density ) * 100 ) );
		const classes =
			'ap-day' +
			( selected ? ' sel' : '' ) +
			( key === todayKey ? ' today' : '' );
		cells.push(
			<button
				type="button"
				class={ classes }
				key={ key }
				disabled={ disabled }
				aria-pressed={ selected ? 'true' : 'false' }
				aria-label={ months[ month ] + ' ' + d }
				onClick={ () => onSelectDay( key ) }
			>
				<span class="n">{ d }</span>
				<span class="bar">
					{ count > 0 && (
						<i style={ { width: Math.max( 12, barWidth ) + '%' } } />
					) }
				</span>
			</button>
		);
	}

	const firstAllowed = year + '-' + pad2( month + 1 );
	const prevDisabled = firstAllowed <= todayKey.slice( 0, 7 );
	// Cap Next at December of the last selectable year so the arrow can never page
	// into a month outside the year <select>'s range (which mirrors the booking
	// horizon). Beyond that there is nothing to book anyway.
	const lastYear = years[ years.length - 1 ];
	const nextDisabled = year > lastYear || ( year === lastYear && month === 11 );

	return (
		<div>
			<div class="ap-cal-head">
				<div class="ap-cal-period">
					<select
						class="ap-cal-select month"
						value={ month }
						aria-label={ __( 'Month', 'aponto' ) }
						onChange={ ( e ) => onMonth( year, Number( e.target.value ) ) }
					>
						{ months.map( ( m, i ) => (
							<option value={ i } key={ i }>
								{ m }
							</option>
						) ) }
					</select>
					<select
						class="ap-cal-select year"
						value={ year }
						aria-label={ __( 'Year', 'aponto' ) }
						onChange={ ( e ) => onMonth( Number( e.target.value ), month ) }
					>
						{ years.map( ( y ) => (
							<option value={ y } key={ y }>
								{ y }
							</option>
						) ) }
					</select>
				</div>
				<div class="ap-cal-nav">
					<button
						type="button"
						aria-label={ COPY.prev_month }
						disabled={ prevDisabled }
						onClick={ () =>
							onMonth(
								month === 0 ? year - 1 : year,
								month === 0 ? 11 : month - 1
							)
						}
					>
						<IconChevronLeft />
					</button>
					<button
						type="button"
						aria-label={ COPY.next_month }
						disabled={ nextDisabled }
						onClick={ () =>
							onMonth(
								month === 11 ? year + 1 : year,
								month === 11 ? 0 : month + 1
							)
						}
					>
						<IconChevronRight />
					</button>
				</div>
			</div>
			<div class="ap-dow" aria-hidden="true">
				{ dow.map( ( d, i ) => (
					<span key={ i }>{ d }</span>
				) ) }
			</div>
			<div class="ap-cal">{ cells }</div>
		</div>
	);
}

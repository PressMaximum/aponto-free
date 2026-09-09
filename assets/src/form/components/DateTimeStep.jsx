/** @jsxImportSource preact */
/**
 * Step 2 — Date & time (SPEC-P1 §2.2 #2).
 *
 * A lazy month calendar plus start-time-only slot chips grouped by the calendar
 * day IN THE DISPLAY TIMEZONE. The friendly `City (GMT±N)` label is always
 * visible in-flow (D1). When the browser zone differs from the business zone the
 * timezone selector appears (defaulting to the browser zone) and the studio time
 * shows as a labelled secondary line. Every rendered time flows through the one
 * `tz.js` formatter — no hand-rolled time math here.
 */
import { StepHeader } from './StepHeader.jsx';
import { Footer } from './Footer.jsx';
import { Calendar } from './Calendar.jsx';
import { CalendarSkeleton, SlotsSkeleton } from './Skeletons.jsx';
import { Banner } from './feedback.jsx';
import { fmtTime, tzLabel } from '../lib/tz.js';
import { formatDuration, formatMoney } from '../lib/format.js';
import { COPY, sprintf } from '../lib/copy.js';

const MON3 = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Human "Mon D" label from a display-tz `YYYY-MM-DD` day key (tz-independent). */
function dayLabel( key ) {
	if ( ! key ) {
		return '';
	}
	const parts = key.split( '-' );
	return MON3[ Number( parts[ 1 ] ) - 1 ] + ' ' + Number( parts[ 2 ] );
}

export function DateTimeStep( {
	service,
	locale,
	// Server-supplied ISO exponent for the site currency (D-R39a).
	currencyExponent = null,
	displayTz,
	businessTz,
	showSelector,
	tzOptions,
	calYear,
	calMonth,
	onMonth,
	availabilityIndex,
	maxSlots,
	availLoading,
	availError,
	onRetryAvail,
	todayKey,
	years,
	selectedDayKey,
	onSelectDay,
	selectedSlotUtc,
	onSelectSlot,
	onChangeDisplayTz,
	stepIndex,
	stepCount,
	focusOnMount,
	onBack,
	onContinue,
	onChangeService,
} ) {
	const daySlots = selectedDayKey
		? availabilityIndex[ selectedDayKey ] || []
		: [];
	const refInstant =
		selectedSlotUtc ||
		( daySlots.length ? daySlots[ 0 ].start_utc : Date.now() );

	function renderSlots() {
		if ( ! selectedDayKey ) {
			return null;
		}
		return (
			<div>
				{ /* The display-zone label is rendered EXACTLY once (D1 keeps it
				   always visible, it just must not stutter): the selector's own
				   value is that label, so the heading only carries it on the
				   same-zone branch where no selector exists. The day and the open
				   count take the heading's trailing slot, as in the reference. */ }
				<div class="ap-slots-head">
					<span class="ap-slots-title">
						<span class="ap-item-title">{ COPY.available_times }</span>
						{ ! showSelector && (
							<small>{ tzLabel( displayTz, refInstant ) }</small>
						) }
					</span>
					<span class="ap-slots-count">
						{ sprintf(
							COPY.slots_day_count,
							dayLabel( selectedDayKey ),
							daySlots.length
						) }
					</span>
				</div>

				{ daySlots.length ? (
					<div class="ap-slots" role="radiogroup" aria-label={ COPY.available_times }>
						{ daySlots.map( ( slot ) => (
							<button
								type="button"
								class="ap-slot"
								key={ slot.start_utc }
								role="radio"
								aria-checked={
									selectedSlotUtc === slot.start_utc
										? 'true'
										: 'false'
								}
								onClick={ () => onSelectSlot( slot.start_utc ) }
							>
								{ fmtTime( slot.start_utc, displayTz, locale ) }
							</button>
						) ) }
					</div>
				) : (
					<div class="ap-noslot">
						{ sprintf(
							COPY.no_slots_day,
							dayLabel( selectedDayKey )
						) }
					</div>
				) }

				{ /* Below the grid, per the reference: the band reads as a footnote
				   to the times it governs instead of wedging itself between the
				   heading and the chips with no breathing room. */ }
				{ showSelector && (
					<div class="ap-visitor-tz">
						<label for="ap-tz-select">{ COPY.visitor_tz_label }</label>
						<select
							id="ap-tz-select"
							value={ displayTz }
							onChange={ ( e ) => onChangeDisplayTz( e.target.value ) }
						>
							{ tzOptions.map( ( iana ) => (
								<option value={ iana } key={ iana }>
									{ tzLabel( iana, refInstant ) }
								</option>
							) ) }
						</select>
						{ selectedSlotUtc && displayTz !== businessTz && (
							<small>
								{ sprintf(
									COPY.business_time_line,
									fmtTime( selectedSlotUtc, businessTz, locale ),
									tzLabel( businessTz, selectedSlotUtc )
								) }
							</small>
						) }
					</div>
				) }
			</div>
		);
	}

	return (
		<div class="ap-step">
			<StepHeader
				title={ COPY.datetime_title }
				sub={ COPY.datetime_sub }
				stepIndex={ stepIndex }
				stepCount={ stepCount }
				focusOnMount={ focusOnMount }
			/>

			{ onChangeService && (
				<div class="ap-change-row">
					<span class="info">
						<b>{ service.name }</b>
						<small>
							{ formatDuration( service.duration_minutes, locale ) }
							{ formatMoney(
								service.price_minor,
								service.currency,
								locale,
								currencyExponent
							)
								? ' · ' +
								  formatMoney(
										service.price_minor,
										service.currency,
										locale,
										currencyExponent
								  )
								: '' }
						</small>
					</span>
					<button type="button" onClick={ onChangeService }>
						{ COPY.change_service }
					</button>
				</div>
			) }

			{ availError ? (
				<div>
					<Banner
						variant="err"
						title={ COPY.load_availability_err }
						body={ COPY.load_retry_sub }
					/>
					<div class="ap-foot">
						{ onBack ? (
							<button type="button" class="ap-back" onClick={ onBack }>
								{ COPY.back }
							</button>
						) : (
							<span />
						) }
						<button
							type="button"
							class="ap-primary"
							onClick={ onRetryAvail }
						>
							{ COPY.try_again }
						</button>
					</div>
				</div>
			) : availLoading && ! Object.keys( availabilityIndex ).length ? (
				<div>
					<CalendarSkeleton />
					<div style={ { marginTop: '18px' } }>
						<SlotsSkeleton />
					</div>
				</div>
			) : (
				<div>
					<Calendar
						year={ calYear }
						month={ calMonth }
						locale={ locale }
						todayKey={ todayKey }
						availabilityIndex={ availabilityIndex }
						selectedDayKey={ selectedDayKey }
						maxSlots={ maxSlots }
						years={ years }
						onSelectDay={ onSelectDay }
						onMonth={ onMonth }
					/>
					{ availLoading ? (
						<div style={ { marginTop: '18px' } }>
							<SlotsSkeleton />
						</div>
					) : (
						renderSlots()
					) }
					<Footer
						onBack={ onBack }
						onPrimary={ onContinue }
						primaryLabel={ COPY.continue }
						primaryDisabled={ ! selectedSlotUtc }
					/>
				</div>
			) }
		</div>
	);
}

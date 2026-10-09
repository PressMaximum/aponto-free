/** @jsxImportSource preact */
/**
 * The one-page intro panel (D-R80) — the FIRST grid column of the `layout: 'one-page'` frame,
 * which replaces the summary sidebar for a block pinned to one service
 * (`docs/mockups/v4/booking-form/single-screen-layout.html`, `introHTML()`).
 *
 * It answers "what am I booking?" before the visitor has touched anything, then becomes the
 * running summary once a time is chosen:
 *
 *   - always: the service name in the SAME heading style as the screen heading (`.ap-h h2`, so
 *     the two titles share a baseline), duration, price when there is one, and the location /
 *     staff rows exactly when the summary sidebar would print them;
 *   - before the pick (`booked` false): the service description, which sells the appointment;
 *   - after the pick (`booked`): the date, start → end, the display zone (+ the studio line
 *     when the zones differ), the edition's coupon rows and the total — the description steps
 *     aside so the card stays as short as the form beside it;
 *   - at the foot: the contact-help line, honouring the block's `contactHelp` / `contactText`.
 *
 * Every row comes from the summary's own row components (`Summary.jsx`), so a time, a total or
 * a staff line can never read differently in the two frames, and every time goes through the one
 * `tz.js` formatter (AGENTS §5 invariant 6).
 *
 * Narrow containers (<700px, CSS only): the panel stacks above the screen. Before the pick it is
 * compact — the description and contact line hide behind "Show details"; after it, the panel
 * collapses to the existing recap-bar pattern (`.ap-recap-bar`), one line that expands.
 *
 * The meeting-method line (D-R82) comes from the BLOCK (`meetingType` / `meetingText`), sits
 * under the duration row and stays on every screen. The host / team line (D-R85) sits under the
 * title: the person or team the SERVER resolved for the block, or the visitor's own pick.
 */
import { useState } from 'preact/hooks';
import { formatDuration, formatPrice } from '../lib/format.js';
import { COPY, sprintf } from '../lib/copy.js';
import {
	ContactHelp,
	SumLocation,
	SumStaff,
	SumWhen,
	SumTotal,
	RecapLine,
	spokenLabel,
} from './Summary.jsx';
import { StaffAvatar, firstNameOf } from './StaffStep.jsx';
import {
	IconClock,
	IconTag,
	IconPin,
	IconPhone,
	IconVideo,
	IconInfo,
} from './icons.jsx';

/** ShadowRoot-scoped ids: every widget lives in its own root. */
export const INTRO_TITLE_ID = 'ap-intro-title';
const INTRO_BODY_ID = 'ap-intro-body';
const INTRO_DESC_ID = 'ap-intro-desc';
const INTRO_HELP_ID = 'ap-intro-help';

/**
 * The meeting-method line's icon and default first line per type (D-R82). `custom` has no
 * default: the operator's text IS its line.
 */
const MEETING = {
	in_person: [ IconPin, 'meeting_in_person' ],
	phone: [ IconPhone, 'meeting_phone' ],
	online: [ IconVideo, 'meeting_online' ],
	custom: [ IconInfo, '' ],
};

/**
 * One icon row with a spoken label: "Duration: 30 min".
 *
 * @param {Object}  props        Props.
 * @param {Object}  props.icon   Icon element.
 * @param {string}  props.label  Spoken label.
 * @param {string}  props.value  Visible value.
 * @param {boolean} props.amount A money amount, which never wraps.
 * @param {string}  props.sub    Muted second line, '' for none.
 * @return {Object} Row.
 */
function MetaRow( { icon, label, value, amount = false, sub = '' } ) {
	return (
		<div class="ap-sum-item">
			{ icon }
			<p class="ap-sum-sub">
				{ spokenLabel( label ) }
				<span class={ amount ? 'k ap-amt' : 'k' }>{ value }</span>
				{ sub ? <br /> : null }
				{ sub || null }
			</p>
		</div>
	);
}

/**
 * "Meeting method: Online meeting / Link sent after booking" (D-R82). The operator's text is a
 * TEXT NODE — never markup and never auto-linked, even when it is a URL: it is public on the
 * page and may be anything. Nothing for no type, or a custom type with no text.
 *
 * @param {Object} props      Props.
 * @param {string} props.type `in_person` | `phone` | `online` | `custom` | ''.
 * @param {string} props.text Operator text, '' for none.
 * @return {?Object} Row.
 */
function MeetingRow( { type, text } ) {
	const entry = MEETING[ type ];
	const label = entry && ( entry[ 1 ] ? COPY[ entry[ 1 ] ] : text );
	if ( ! label ) {
		return null;
	}
	const Icon = entry[ 0 ];
	return (
		<MetaRow
			icon={ <Icon /> }
			label={ COPY.meeting_label }
			value={ label }
			sub={ entry[ 1 ] ? text : '' }
		/>
	);
}

/**
 * "A, B or C" in the visitor's language — `Intl.ListFormat` (disjunction) where the engine has
 * it, a plain comma list where it does not.
 *
 * @param {string[]} items  Items.
 * @param {string}   locale Locale.
 * @return {string} List.
 */
function orList( items, locale ) {
	try {
		return new Intl.ListFormat( locale || undefined, {
			type: 'disjunction',
		} ).format( items );
	} catch {
		return items.join( ', ' );
	}
}

/**
 * The host / team line (D-R85), under the service title: avatar(s) on the SAME line as the name,
 * the job title on its own full-width line below; a team is its stacked avatars alone on the first
 * line and "You'll meet A, B or C" below. Every value is
 * a text node; the avatars are decorative (the shared `StaffAvatar`: initials first, the photo
 * revealed only once it loads, `alt=""`), and the name carries the spoken "With:" the other rows
 * use. A team pictures at most three faces plus a "+N" chip; the names list at most three first
 * names, then "or another team member".
 *
 * @param {Object}  props        Props.
 * @param {Object}  props.host   `{kind: 'person', member}` or `{kind: 'team', members, total, others}`.
 * @param {string}  props.locale Locale.
 * @return {Object} Line.
 */
function HostRow( { host, locale } ) {
	const face = ( m, i ) => (
		<StaffAvatar
			key={ i }
			name={ m.name }
			first={ m.first_name }
			last={ m.last_name }
			photo={ m.avatar }
		/>
	);
	if ( 'person' === host.kind ) {
		const m = host.member;
		return (
			<div class="ap-intro-host">
				<div class="ap-intro-host-row">
					{ face( m, 0 ) }
					<span class="ap-intro-host-name">
						{ spokenLabel( COPY.summary_with ) }
						{ m.name }
					</span>
				</div>
				{ m.title ? <p class="ap-intro-host-sub">{ m.title }</p> : null }
			</div>
		);
	}
	const names = host.members.map( ( m ) => firstNameOf( m ) );
	// "+N" counts PUBLIC people beyond the faces; hidden colleagues the any-staff path may assign
	// only add the generic "or another team member" — never a number (D-R85 fix round 2).
	if ( host.total > host.members.length || host.others ) {
		names.push( COPY.host_another );
	}
	const sentence = sprintf( COPY.host_meet, orList( names, locale ) );
	const extra = host.total - host.members.length;
	return (
		<div class="ap-intro-host">
			<div class="ap-intro-host-row">
				<span class="ap-av-stack" aria-hidden="true">
					{ host.members.map( face ) }
					{ extra > 0 ? (
						<span class="ap-av">{ sprintf( COPY.host_more, extra ) }</span>
					) : null }
				</span>
			</div>
			{ /* The faces are decorative, so the sentence carries the spoken "With:". */ }
			<p class="ap-intro-host-sub">
				{ spokenLabel( COPY.summary_with ) }
				{ sentence }
			</p>
		</div>
	);
}

export function IntroPanel( {
	service,
	// A time is chosen AND the visitor has moved past Date & time (Details, Payment,
	// Confirmation). Drives the description → pick swap and the narrow recap bar.
	booked = false,
	staffName = '',
	staffTitle = '',
	staffAny = false,
	staffTerm = '',
	locationName = '',
	locationAddress = '',
	contactPhone = '',
	contactText = '',
	locale,
	currencyExponent = null,
	displayTz,
	businessTz,
	slotUtc = null,
	priceRows = null,
	totalMinor = null,
	// The paying gateway's own line under the total (T-025), as in the sidebar; '' for none.
	totalNote = '',
	// Server payment terms: a deposit order shows "due now / balance later" under the total
	// (D-R71). The caller withholds them on Confirmation, which prints the SETTLED lines.
	paymentTerms = null,
	// "Change time" under the chosen time (Details and Payment): back to Date & time with the
	// typed details kept — the same handler as Back. Null hides it (Confirmation, a resume leg,
	// a gateway mid-attempt).
	onChangeTime = null,
	// How the appointment takes place (D-R82, block attributes, already allow-listed and
	// stripped to plain text by `resolveConfig()`): '' = no line.
	meetingType = '',
	meetingText = '',
	// Who the visitor will meet (D-R85): `{kind: 'person', member}` | `{kind: 'team', …}`, or
	// null for no line. When it is drawn it REPLACES the summary's "With:" row, which would say
	// the same thing twice.
	host = null,
} ) {
	// Narrow-form disclosures; inert at ≥700px, where CSS shows everything.
	const [ more, setMore ] = useState( false );
	const [ open, setOpen ] = useState( false );

	const price = formatPrice(
		service.price_minor,
		service.currency,
		locale,
		currencyExponent
	);
	const desc = booked ? '' : String( service.description || '' ).trim();
	const recap = booked && !! slotUtc;

	return (
		<aside
			class={
				'ap-intro' +
				( recap ? ' is-recap' : '' ) +
				( recap && open ? ' is-open' : '' ) +
				( more ? ' is-expanded' : '' )
			}
			aria-labelledby={ INTRO_TITLE_ID }
		>
			{ recap && (
				<button
					type="button"
					class="ap-recap-bar"
					aria-expanded={ open ? 'true' : 'false' }
					aria-controls={ INTRO_BODY_ID }
					onClick={ () => setOpen( ( o ) => ! o ) }
				>
					<RecapLine
						service={ service }
						slotUtc={ slotUtc }
						displayTz={ displayTz }
						locale={ locale }
					/>
					<span class={ 'ap-recap-chev' + ( open ? ' up' : '' ) }>
						<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
							<path d="M9 6l6 6-6 6" />
						</svg>
					</span>
				</button>
			) }
			<div class="ap-intro-body" id={ INTRO_BODY_ID }>
				<div class="ap-intro-main">
					<div class="ap-h">
						<h2 id={ INTRO_TITLE_ID }>{ service.name }</h2>
					</div>
					{ host ? <HostRow host={ host } locale={ locale } /> : null }
					<MetaRow
						icon={ <IconClock /> }
						label={ COPY.summary_duration }
						value={ formatDuration( service.duration_minutes, locale ) }
					/>
					<MeetingRow type={ meetingType } text={ meetingText } />
					{ price ? (
						<MetaRow
							icon={ <IconTag /> }
							label={ COPY.summary_price }
							value={ price }
							amount
						/>
					) : null }
					<SumLocation name={ locationName } address={ locationAddress } />
					{ host ? null : (
						<SumStaff
							name={ staffName }
							title={ staffTitle }
							any={ staffAny }
							term={ staffTerm }
						/>
					) }
					{ recap ? (
						<div class="ap-intro-pick">
							<SumWhen
								slotUtc={ slotUtc }
								durationMinutes={ service.duration_minutes }
								displayTz={ displayTz }
								businessTz={ businessTz }
								locale={ locale }
								spoken={ COPY.summary_time }
							>
								{ onChangeTime ? (
									<button
										type="button"
										class="ap-link ap-intro-change"
										onClick={ onChangeTime }
									>
										{ COPY.change_time }
									</button>
								) : null }
							</SumWhen>
							<SumTotal
								service={ service }
								locale={ locale }
								currencyExponent={ currencyExponent }
								priceRows={ priceRows }
								totalMinor={ totalMinor }
								totalNote={ totalNote }
								paymentTerms={ paymentTerms }
							/>
						</div>
					) : null }
					{ desc ? (
						<p class="ap-intro-desc" id={ INTRO_DESC_ID }>
							{ desc }
						</p>
					) : null }
					{ /* Only where there is something to reveal: the description or the contact
					   line (both hidden on a narrow first screen until asked for). */ }
					{ ! recap && ( desc || contactPhone ) ? (
						<button
							type="button"
							class="ap-link ap-intro-more"
							aria-expanded={ more ? 'true' : 'false' }
							aria-controls={ [
								desc ? INTRO_DESC_ID : '',
								contactPhone ? INTRO_HELP_ID : '',
							]
								.filter( Boolean )
								.join( ' ' ) }
							onClick={ () => setMore( ( m ) => ! m ) }
						>
							{ more ? COPY.intro_less : COPY.intro_more }
						</button>
					) : null }
				</div>
				<ContactHelp
					phone={ contactPhone }
					title={ contactText }
					id={ INTRO_HELP_ID }
				/>
			</div>
		</aside>
	);
}

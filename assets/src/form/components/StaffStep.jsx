/** @jsxImportSource preact */
/**
 * Staff step (D-R50, founder 2026-09-20) — a DEDICATED step between Service and Date & time,
 * present only when the chosen service has more than one eligible active staff member and the
 * site publishes a roster (`/public/services` `staff[]`, rest-contract §3.1).
 *
 * Deliberately modelled on the Service step rather than invented: same SELECT-THEN-AUTO-ADVANCE
 * behaviour, same selected affordance. The two steps sit next to each other in the flow, so a
 * radio-plus-Continue step here would make the first two screens of the same form behave
 * differently for no reason the customer could name.
 *
 * **D-R51 — the PUBLIC PROFILE, phase 1.** Rows carry an avatar and, under the name, the
 * operator-authored job title.
 *
 * **D-R52 — phase 2** (mockup `docs/mockups/v4/booking-form/specialist-step.html`, approved
 * 2026-09-20). Five things this file now holds up:
 *
 *  - **ONE component, TWO modes.** The base is the LIST row; `.ap-staff-list.cards` is a
 *    container-query override on the CONTENT column (3 columns ≥600px, 2 ≥400px, rows below).
 *    "Cards degrades to List" is the same DOM losing one query — no second markup tree, no JS
 *    re-render, and no second set of a11y semantics to get wrong.
 *  - **Every row has a media slot, or none of them does.** A list where some rows have a circle
 *    and some do not loses its rhythm and reads as broken. With photos ON a member with no
 *    photo gets initials; with `photos` OFF the slot is gone everywhere, including from the
 *    "Any available" row — a lone icon beside text-only rows is the same raggedness.
 *  - **The initials are ALWAYS underneath and the photo is revealed only once it loads.** A
 *    Gravatar URL carries `d=404`, so "this person has no Gravatar" arrives as an ordinary 404;
 *    painting the mark first means it costs no broken-image glyph, no empty circle and no reflow.
 *  - **The profile trigger is a SIBLING, never nested.** The selectable control and the "Learn
 *    more" button are siblings inside a plain container, so there is no nested interactive
 *    content and reaching for the trigger can never commit the step by accident.
 *  - **No noun is hard-coded.** Aponto serves salons, clinics, gyms and tutors; the heading and
 *    the "Any available" sub are `sprintf` templates over the site's own term
 *    (`booking.staff_label`, default "staff member"), rendered as text nodes.
 */
import { IconCheck, IconInfo, IconSparkle } from './icons.jsx';
import { StepHeader } from './StepHeader.jsx';
import { Footer } from './Footer.jsx';
import { useState } from 'preact/hooks';
import { COPY, sprintf } from '../lib/copy.js';
import { initialsOf, normalizePart } from '../../shared/person-name.js';

/**
 * The circle's rendered size per placement, used for the `<img>`'s `width`/`height` (fix
 * round 1, B2 — a card avatar was declaring 44 while rendering at 72).
 *
 * These attributes reserve an ASPECT RATIO before the image lands; the CSS variable
 * `--ap-staff-av` owns the used size, and the ratio is 1:1 at every one of these. So the one
 * case they cannot describe — a `cards` list that has degraded to rows under the 400px
 * container query, where the paint is 44 and the attribute says 72 — costs nothing: the box
 * the browser reserves is still square and the CSS still wins.
 *
 * The `srcset` needs no matching `sizes`: its candidates carry `x` descriptors, which the
 * browser resolves against DEVICE PIXEL RATIO alone. A 2x screen therefore takes the 2x URL
 * (300px for an upload, 192px for a Gravatar) for every placement here, and the largest of
 * them — a 72px card at 2x — needs 144.
 */
const AVATAR_PX = { row: 44, card: 72, dialog: 64 };

/**
 * The name a staff member is ADDRESSED by — "Book with Ana", "About Ana" (name split,
 * 2026-10-01). The stored `first_name` when the roster carries it; otherwise the first word of
 * the composed display name, the only guess left for a payload without the parts.
 *
 * @param {?Object} member Roster entry (`first_name` and/or `name`).
 * @return {string} First name ('' for a nameless entry).
 */
export function firstNameOf( member ) {
	const m = member || {};
	return (
		normalizePart( m.first_name ) ||
		normalizePart( m.name ).split( ' ' )[ 0 ]
	);
}

/**
 * The portrait circle: a photo painted over the initials, or the initials alone.
 *
 * **The initials are always in the DOM, and the photo is painted ON TOP of them once it has
 * actually loaded.** Swapping `<img>` for initials only in `onError` would mean a broken-image
 * glyph or an empty circle for as long as the request takes to fail, and then a reflow. Here the
 * circle is correct from the first paint, the image fades in over it if it arrives, and
 * `onError` simply drops it — no flash, no layout shift and no retry loop, because the failed
 * URL is removed from the tree rather than re-rendered.
 *
 * `alt=""` is deliberate and not an oversight — the name is right beside the image in the same
 * control, so a screen reader that announced it twice would read the row's label twice.
 *
 * Exported because the profile dialog draws the same circle at 64px from the same props, and
 * two implementations of "reveal on load" would eventually disagree.
 *
 * The initials come from the shared rule (`initialsOf`, D-R51: first + last word, so "Ana
 * Maria Silva" is AS) — the admin draws the same person with the same mark.
 *
 * @param {Object}  props         Props.
 * @param {string}  props.name    Display name (initials fallback when the parts are absent).
 * @param {string}  [props.first] First name, when the roster carries it.
 * @param {string}  [props.last]  Last name, when the roster carries it.
 * @param {?Object} [props.photo] `{url, url2x}` or null.
 * @param {string}  [props.place] Which circle this is: `row` (44), `card` (72) or `dialog` (64).
 * @return {Object} Avatar.
 */
export function StaffAvatar( {
	name,
	first = '',
	last = '',
	photo = null,
	place = 'row',
} ) {
	const [ failed, setFailed ] = useState( false );
	const [ loaded, setLoaded ] = useState( false );

	return (
		<span class="ap-av" aria-hidden="true">
			{ initialsOf( { name, first_name: first, last_name: last } ) }
			{ photo && ! failed ? (
				<img
					class={ 'ap-av-img' + ( loaded ? ' is-loaded' : '' ) }
					src={ photo.url }
					srcset={ `${ photo.url } 1x, ${ photo.url2x } 2x` }
					width={ AVATAR_PX[ place ] || AVATAR_PX.row }
					height={ AVATAR_PX[ place ] || AVATAR_PX.row }
					loading="lazy"
					decoding="async"
					alt=""
					onLoad={ () => setLoaded( true ) }
					onError={ () => setFailed( true ) }
				/>
			) : null }
		</span>
	);
}

/**
 * One roster entry — the same DOM in both layouts.
 *
 * The wrapper is a plain `<div>`, NOT a button: the choice control and the profile trigger are
 * siblings inside it. That is what keeps focus order "choice → its own trigger → next choice"
 * and keeps the markup valid.
 *
 * @param {Object}    props           Props.
 * @param {string}    props.name      Row title (the display name).
 * @param {string}    [props.first]   First name — the avatar initials.
 * @param {string}    [props.last]    Last name — the avatar initials.
 * @param {string}    [props.sub]     Optional sub line (the job title, or the "any" explanation).
 * @param {?Object}   [props.photo]   Avatar `{url, url2x}` or null.
 * @param {boolean}   [props.any]     Whether this is the "Any available" row.
 * @param {boolean}   [props.media]   Whether the media slot is drawn at all (`photos` setting).
 * @param {boolean}   props.selected  Whether this row is the current choice.
 * @param {Function}  props.onClick   Click handler.
 * @param {?Function} [props.onInfo]  Profile-dialog opener, or null for no trigger. Receives the
 *                                    trigger element so focus can return to this exact button.
 * @param {boolean}   [props.ghost]   Whether to reserve an empty trailing cell because some
 *                                    OTHER row in this list has a trigger (fix round 1, B4).
 * @param {string}    [props.place]   Avatar placement (`row` or `card`).
 * @param {?Object}   [props.mark]    An icon for the rounded-square mark slot instead of an
 *                                    avatar — the Location step's pin (D-R62), which reuses this
 *                                    row verbatim so it adds no CSS and no second a11y model.
 * @return {Object} Row.
 */
export function StaffRow( {
	name,
	first = '',
	last = '',
	sub = '',
	photo = null,
	any = false,
	mark = null,
	media = true,
	selected,
	onClick,
	onInfo = null,
	ghost = false,
	place = 'row',
} ) {
	return (
		<div
			class={
				'ap-staff-item' +
				( any ? ' any' : '' ) +
				( selected ? ' is-sel' : '' )
			}
		>
			<button
				type="button"
				class="ap-staff-btn"
				aria-pressed={ selected ? 'true' : 'false' }
				onClick={ onClick }
			>
				{ media &&
					( any || mark ? (
						<span class="ap-staff-mark" aria-hidden="true">
							{ mark || <IconSparkle /> }
						</span>
					) : (
						<StaffAvatar
							name={ name }
							first={ first }
							last={ last }
							photo={ photo }
							place={ place }
						/>
					) ) }
				<span class="ap-staff-txt">
					<span class="ap-staff-name">{ name }</span>
					{ sub ? (
						<span class="ap-staff-role">{ sub }</span>
					) : null }
				</span>
				<span class="ap-staff-tick" aria-hidden="true">
					<IconCheck />
				</span>
				{ ! onInfo && ghost && (
					// The SAME box as a real trigger, hidden — so the ticks stay in one column
					// whatever the container width does to the "Learn more" label (fix round 1,
					// B4). It sits INSIDE the button so the row's hover and click cover the
					// whole width; outside it the cell read as a cut-off corner (founder
					// review 2026-09-30). A `<span>`, so nothing here is focusable.
					<span class="ap-staff-info ap-staff-info-ghost" aria-hidden="true">
						<IconInfo />
						<span class="ap-staff-info-t">
							{ COPY.staff_learn_more }
						</span>
					</span>
				) }
			</button>
			{ onInfo && (
				<button
					type="button"
					class="ap-staff-info"
					aria-haspopup="dialog"
					aria-label={ sprintf(
						COPY.staff_about,
						name
					) }
					onClick={ ( event ) => onInfo( event.currentTarget ) }
				>
					<IconInfo />
					<span class="ap-staff-info-t" aria-hidden="true">
						{ COPY.staff_learn_more }
					</span>
				</button>
			) }
		</div>
	);
}

/**
 * @param {Object}    props               Props.
 * @param {Array}     props.staff         Eligible staff, in roster order.
 * @param {?number}   props.selectedId    Chosen staff id, or null for "Any available".
 * @param {Object}    props.display       Resolved `config.staff` block (layout/photos/titles/
 *                                        profiles/choice/label — D-R52).
 * @param {string}    props.term          The site's word for a staff member, already resolved.
 * @param {number}    props.stepIndex     1-based position in the honest step list.
 * @param {number}    props.stepCount     Total steps in this booking.
 * @param {boolean}   props.focusOnMount  Whether to move focus to the heading.
 * @param {Function}  props.onSelect      Called with the id, or null for any.
 * @param {Function}  props.onOpenProfile Called with `(member, triggerEl)` to open the dialog.
 * @param {?Function} props.onBack        Back to Service, or null when this is the first step.
 * @return {Object} Step.
 */
export function StaffStep( {
	staff,
	selectedId,
	display,
	term,
	stepIndex,
	progress,
	stepCount,
	focusOnMount,
	onSelect,
	onOpenProfile,
	onBack,
} ) {
	const cards = 'cards' === display.layout;
	/**
	 * Whether ANY row in this list opens a profile. Two things key off it: the ghost cell that
	 * keeps the ticks in one column on the rows that do not (fix round 1, B4), and the column
	 * count below.
	 */
	const anyProfile =
		display.profiles && staff.some( ( member ) => !! member.bio );
	/**
	 * COLUMNS = min(people, 3) at the widest breakpoint (fix round 1, B5). Two staff in a
	 * 3-column grid left a dead third column under the full-width "Any available" banner, which
	 * reads as a card that failed to render. The count travels as a class so the layout itself
	 * stays CSS — the grid still equalises card heights per row.
	 */
	const cols = staff.length < 3 ? ' cols-' + Math.max( 1, staff.length ) : '';
	// "Customers must choose" removes the escape hatch, so the row is not rendered and the sub
	// must not promise it either (D-R52). Everything else about the step is identical.
	const required = 'required' === display.choice;
	const title = sprintf( COPY.staff_title, term );

	return (
		<div class="ap-step">
			<StepHeader
				title={ title }
				sub={ required ? COPY.staff_sub_required : COPY.staff_sub }
				stepIndex={ stepIndex }
				progress={ progress }
				stepCount={ stepCount }
				focusOnMount={ focusOnMount }
			/>
			<div
				class={
					'ap-staff-list' +
					( cards ? ' cards' + cols : ' scroll' ) +
					( display.photos ? '' : ' no-photos' )
				}
				role="group"
				aria-label={ title }
			>
				{ ! required && (
					<StaffRow
						name={ COPY.staff_any }
						sub={ sprintf(
							cards
								? COPY.staff_any_sub_short
								: COPY.staff_any_sub,
							term
						) }
						any
						media={ display.photos }
						selected={ selectedId === null }
						onClick={ () => onSelect( null ) }
						ghost={ anyProfile }
					/>
				) }
				{ staff.map( ( member ) => (
					<StaffRow
						key={ member.id }
						name={ member.name }
						first={ member.first_name }
						last={ member.last_name }
						sub={ display.titles ? member.title || '' : '' }
						photo={ display.photos ? member.avatar || null : null }
						media={ display.photos }
						selected={ member.id === selectedId }
						onClick={ () => onSelect( member.id ) }
						// The trigger exists ONLY where there is something to open: the
						// site-wide opt-in is on AND this person actually filled a bio. That
						// is what stops switching the setting on from putting an empty "Learn
						// more" under a colleague who left the field blank (D-R52). The server
						// enforces the same rule by not publishing `bio` at all.
						place={ cards ? 'card' : 'row' }
						onInfo={
							display.profiles && member.bio
								? ( trigger ) =>
										onOpenProfile( member, trigger )
								: null
						}
						ghost={ anyProfile }
					/>
				) ) }
			</div>
			{ ( onBack || undefined !== selectedId ) && (
				<Footer
					onBack={ onBack }
					onPrimary={
						undefined !== selectedId ? () => onSelect( selectedId ) : null
					}
					primaryLabel={ COPY.continue }
				/>
			) }
		</div>
	);
}

/** @jsxImportSource preact */
/**
 * Staff profile dialog (D-R52; mockup `docs/mockups/v4/booking-form/specialist-step.html`).
 *
 * Opened from the "Learn more" trigger beside a staff row/card, and only ever when the site-wide
 * opt-in "Let customers view staff profiles" is on AND that person filled a bio — the server
 * does not publish `bio` otherwise, so there is nothing to open.
 *
 * **Scoped to the booking CARD, not the page.** The dialog is rendered as a child of `.ap` and
 * positions against it, inside the widget's shadow root. A page-level overlay would have to
 * out-z-index the host's sticky headers, cookie bars and the theme's own modals, would inherit
 * the host `body` scroll-lock bugs, and would throw a full-viewport scrim over somebody else's
 * page — the opposite of "the form dissolves into the host theme". `.ap` already has
 * `overflow: clip`, so the panel is clipped to the card for free.
 *
 * **It covers the whole card, sidebar included.** `aria-modal` already hides the rest of the
 * widget from assistive tech, so leaving the summary operable behind it would be a lie to
 * sighted users only. The summary stays READABLE through the scrim, which is the point: you can
 * still see what you are booking.
 *
 * **The bio is rendered as a TEXT NODE.** The column is plain text by construction (D-R51:
 * `sanitize_textarea_field`, precisely so it can be rendered this way), and the paragraph breaks
 * an operator typed survive through CSS `white-space: pre-line` rather than through any markup.
 * Nothing in this file touches `innerHTML` / `dangerouslySetInnerHTML`.
 */
import { useEffect, useRef } from 'preact/hooks';
import { IconClose } from './icons.jsx';
import { StaffAvatar, firstNameOf } from './StaffStep.jsx';
import { COPY, sprintf } from '../lib/copy.js';

/** ShadowRoot-scoped id: every widget instance lives in its own root, so this cannot collide. */
const NAME_ID = 'ap-staff-profile-name';

/**
 * Focusable descendants of the panel, in document order.
 *
 * `offsetParent` is the cheap "is it actually rendered" test the mockup used; it is null for a
 * `display: none` element and for anything inside one. jsdom reports it as null for everything,
 * which is why the trap is also correct — and untestable — through the panel's own boundaries.
 *
 * @param {HTMLElement} root Panel.
 * @return {Array<HTMLElement>} Focusable elements.
 */
function focusables( root ) {
	return Array.prototype.filter.call(
		root.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		),
		( el ) => ! el.disabled
	);
}

/**
 * @param {Object}   props           Props.
 * @param {Object}   props.member    Roster entry `{id, name, title, bio, avatar}`.
 * @param {boolean}  props.photos    Whether the site shows photos at all (`booking.staff_photos`).
 * @param {boolean}  props.titles    Whether the site shows job titles (`booking.staff_titles`).
 * @param {Function} props.onClose   Close without choosing.
 * @param {Function} props.onBook    Choose this person and advance, exactly like the card click.
 * @return {Object} Dialog.
 */
export function StaffProfileDialog( {
	member,
	photos,
	titles,
	onClose,
	onBook,
} ) {
	const panelRef = useRef( null );

	// Focus moves to the PANEL, not to its first control: the first thing in the dialog is the
	// person's name and picture, and dropping focus on "Close" would read the dismissal before
	// the content. `tabindex="-1"` makes that legal.
	useEffect( () => {
		if ( panelRef.current ) {
			panelRef.current.focus();
		}
	}, [] );

	/**
	 * Esc closes; Tab cycles inside the panel.
	 *
	 * The trap is the FALLBACK, not the mechanism: the card behind is marked `inert` while this
	 * is open, which removes it from the tab order and from the a11y tree in every engine that
	 * supports the attribute. `inert` has been in all three since 2023 but the widget also runs
	 * on whatever browser a customer actually has, and a focus trap costs eight lines.
	 *
	 * @param {KeyboardEvent} event Key event.
	 */
	function onKeyDown( event ) {
		if ( 'Escape' === event.key ) {
			event.preventDefault();
			onClose();
			return;
		}
		if ( 'Tab' !== event.key ) {
			return;
		}
		const panel = panelRef.current;
		if ( ! panel ) {
			return;
		}
		const list = focusables( panel );
		if ( ! list.length ) {
			return;
		}
		const first = list[ 0 ];
		const last = list[ list.length - 1 ];
		const active = panel.getRootNode().activeElement;
		if ( event.shiftKey && ( active === first || active === panel ) ) {
			event.preventDefault();
			last.focus();
		} else if ( ! event.shiftKey && active === last ) {
			event.preventDefault();
			first.focus();
		}
	}

	const title = titles ? member.title || '' : '';
	// The stored first name (name split, 2026-10-01): "Book with Ana", while the heading keeps
	// the full display name.
	const firstName = firstNameOf( member );

	return (
		<div class="ap-modal">
			{ /* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events --
			     The scrim is a redundant affordance: Esc and the two buttons inside the panel are
			     the keyboard paths, and a focusable scrim would add a tab stop with no name. */ }
			<div class="ap-modal-scrim" onClick={ onClose } />
			<div
				class="ap-modal-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby={ NAME_ID }
				tabIndex={ -1 }
				ref={ panelRef }
				onKeyDown={ onKeyDown }
			>
				<div class="ap-modal-head">
					{ photos && (
						<StaffAvatar
							name={ member.name }
							first={ member.first_name }
							last={ member.last_name }
							photo={ member.avatar || null }
							place="dialog"
						/>
					) }
					<div class="ap-modal-id">
						<h3 class="ap-modal-name" id={ NAME_ID }>
							{ member.name }
						</h3>
						{ title ? (
							<p class="ap-modal-role">{ title }</p>
						) : null }
					</div>
					<button
						type="button"
						class="ap-modal-x"
						aria-label={ COPY.staff_profile_close }
						onClick={ onClose }
					>
						<IconClose />
					</button>
				</div>
				<div class="ap-modal-body">
					<p class="ap-modal-bio">{ member.bio }</p>
				</div>
				<div class="ap-modal-foot">
					<button type="button" class="ap-back" onClick={ onClose }>
						{ COPY.tz_close }
					</button>
					{ /* Not a dead end: the one primary selects this person and advances,
					     exactly like tapping the card. Same one-primary / text-secondary
					     grammar as every step footer. */ }
					<button
						type="button"
						class="ap-primary"
						onClick={ () => onBook( member.id ) }
					>
						{ sprintf( COPY.staff_book_with, firstName ) }
					</button>
				</div>
			</div>
		</div>
	);
}

/**
 * Staff workspace (SPEC-P1 §1.2/§1.3 / mockup §7.5) — full-page, one continuous
 * form whose sections are CARDS (D-R55, founder 2026-09-21: the flat rules made the
 * groups hard to tell apart) reusing the Settings panel anatomy through
 * `lib/EditorCard.jsx`. The sticky section nav scrolls to six anchors — one per card, with
 * "Calendar connections" present exactly when its card is (founder QA 2026-09-21):
 *   1. Details    — avatar / name* / email* / phone / status (POST|PATCH /staff).
 *   1b. Public profile (D-R51) — photo, job title, short bio and the "Show on booking form"
 *                   switch. Its OWN card since D-R55: those four fields are the only ones on
 *                   this page a CUSTOMER ever sees, and an operator filling in a phone number
 *                   has to be able to tell the difference. Present in BOTH editions — Free's
 *                   single profile included.
 *   1c. Calendar connections — a card only when a per-staff integration is available, and a nav
 *                   anchor on exactly the same condition. Both ask `perStaffIntegrations()`,
 *                   which reads the boot catalog: a page-load constant, so the nav is stable for
 *                   the life of the editor and on any given site.
 *   2. Services   — READ-ONLY list of the services this member is eligible for (with the
 *                   branches of each assignment once the site has locations, D-R63), from the
 *                   additive `service_ids` on `GET /staff/{id}` (D-R28, the reverse of
 *                   `GET /services/{id}/eligibility`). Assignment is EDITED on the service,
 *                   not here: eligibility is a full-replacement PUT per service
 *                   (rest-contract §2.18), so two editors writing the same table from
 *                   opposite ends would let a staff-side save silently drop another
 *                   service's location pairs. One writer, one direction.
 *   3. Work hours — inherited business-hours summary + Customize (deep-copy the
 *                   business rows into staff rows) + Revert (drop staff weekly rows,
 *                   keep date overrides), via GET/PUT /staff/{id}/schedule (§1.3).
 *                   The section saves on its own AND is flushed by the page Save —
 *                   one continuous form must never drop a pending edit silently.
 *                   With ≥1 active location it gains per-BRANCH tabs (D-R63): each branch
 *                   is its own scope (`?location_id=N`), inheriting until customized.
 *   4. Time off   — blocked periods (CRUD) that also render on the Calendar.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { isoDate, longDate, timeLabel, toUtcInstant } from '../lib/format.js';
import { useInFlight } from '../lib/in-flight.js';
import { displayName, normalizePart, initials } from '../../shared/person-name.js';
import { businessLocalDateToUtcIso } from '../calendar/constants.js';
import { renderIcon } from '../lib/icon.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { WEEKDAYS, WeeklyHoursGrid, formatMinutes, validateWeekly } from '../lib/WeeklyHoursGrid.jsx';
import { EditorCard } from '../lib/EditorCard.jsx';
import { useFocusFirstError } from '../lib/focus-first-error.js';
import { fieldClass, fieldAria, FieldErrors } from '../lib/field-error.jsx';
import { useSectionNav } from '../lib/section-nav.js';
import { usePageTitle } from '../lib/page-title.js';
import { MODULE_META } from '../modules/catalog.js';
import { activeLocations, fetchLocations } from '../lib/branches.js';
import { locationScopeLabel, memberLocationIds } from '../lib/assignment-pairs.js';
import { cloneWeekly, copySourceIds, dirtyScopeIds, inheritedSource, periodsByWeekday, seedWeekly, weeklyMap, weeklyRows } from '../lib/branch-hours.js';

const TZ = config.business.timezone;
const STATUS_OPTIONS = [ { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' } ];

/** `title` ceiling — the `varchar(191)` column, mirrored from `StaffController::TITLE_MAX`. */
const TITLE_MAX = 191;

/** `bio` ceiling — the product limit, mirrored from `StaffController::BIO_MAX` (D-R51). */
const BIO_MAX = 600;

/** Card-header line for Work hours — shared by the loading and loaded renders (D-R55). */
const HOURS_DESCRIPTION = 'The weekly hours this person can be booked.';

function businessWeeklyMap() {
	const map = {};
	( config.businessHours || [] ).forEach( ( row ) => { map[ row.weekday ] = row.periods || []; } );
	return map;
}

/**
 * The discard question, in ONE place.
 *
 * THREE guards ask it now (D-R58; handoff 2026-09-21 §4): this editor's own Cancel,
 * `routes/Staff.jsx`'s cross-route `nav-guard` handler, and the same-route hold in
 * `lib/editor-guards.js`. Asking it in three sets of words would read as three different features,
 * which is why `LocationEditor.jsx` exports its own the same way. Module-level, so its identity is
 * stable enough to key the registering effect.
 *
 * @return {Object} `useConfirmDialog` options.
 */
export function discardPrompt() {
	return {
		title: __( 'Discard your changes?', 'aponto' ),
		message: __( 'This staff member has edits that have not been saved. Leaving now discards them.', 'aponto' ),
		confirmText: __( 'Discard changes', 'aponto' ),
		cancelText: __( 'Keep editing', 'aponto' ),
		destructive: true,
	};
}

/**
 * The Details card's form state for a staff DTO (or a blank one for a create).
 *
 * Extracted so the initial state and the dirty BASELINE are the same shape by construction — a
 * baseline computed a second way is a baseline that drifts.
 *
 * @param {Object} [staff] Staff DTO, or nothing for a new member.
 * @return {Object} Details form state.
 */
function detailsFrom( staff ) {
	return {
		// Name split (2026-10-01): `first_name` is required, `last_name` optional — a staff row
		// may be a room or a chair (`type: 'resource'`), which has no family name.
		first_name: staff?.first_name || '',
		last_name: staff?.last_name || '',
		email: staff?.email || '',
		phone: staff?.phone || '',
		status: staff?.status || 'active',
		// Public profile (D-R51). `is_public` defaults to TRUE for a NEW member too: the
		// column defaults to 1, so a create that never touched the switch must send the same
		// answer the database would have given.
		title: staff?.title || '',
		bio: staff?.bio || '',
		is_public: staff?.is_public !== false,
		avatar_id: staff?.avatar?.id ?? staff?.avatar_id ?? null,
	};
}

export function StaffWorkspace( { mode, staff, onClose, onSaved, onCreated, onDirtyChange, closeAfterSave = true } ) {
	const showToast = useToast();
	const { confirm, dialog } = useConfirmDialog();
	const creating = mode === 'create';
	// The tab title names the record being edited — its SAVED name, not the one being typed.
	usePageTitle( creating ? __( 'New staff member', 'aponto' ) : displayName( staff?.first_name, staff?.last_name ) || staff?.name );
	const [ details, setDetails ] = useState( () => detailsFrom( staff ) );
	// Signature of the details the SERVER currently holds — anything else is a pending edit. It is
	// state, not the `staff` prop, because a save that keeps this editor open (the Free single
	// profile, `closeAfterSave = false`) has to be able to move it.
	const [ baseline, setBaseline ] = useState( () => JSON.stringify( detailsFrom( staff ) ) );
	// Pending edits the SUB-SECTIONS hold. This page is one continuous form — the page Save already
	// flushes the work-hours grid — so "unsaved" has to mean the same thing to the guard that it
	// means to Save, rather than a second, narrower idea of dirty invented alongside it.
	const [ hoursDirty, setHoursDirty ] = useState( false );
	const [ timeOffDirty, setTimeOffDirty ] = useState( false );
	// The RESOLVED avatar the server computed through the D-R51 chain (upload → verified
	// Gravatar → nothing), plus which step answered. `source` is display only: the write side
	// still sends `avatar_id`, and a Gravatar is not something this editor can set.
	const [ avatarUrl, setAvatarUrl ] = useState( staff?.avatar?.url || '' );
	const [ avatarSource, setAvatarSource ] = useState( staff?.avatar?.source || '' );
	// Whether the resolved image has ACTUALLY loaded. The server does not know whether a
	// Gravatar exists any more (the URL carries `d=404`), so only the browser can say — and the
	// source caption must not claim "From Gravatar" for a picture that 404'd.
	//
	// Both are keyed by URL rather than kept as booleans (first-run QA D09): a save that resolves
	// the SAME URL re-uses the `<img>`, so no second `load` ever fires, and a flag reset on save
	// left the picture at opacity 0 until a reload. A URL that has loaded stays loaded; a new
	// URL starts unloaded by construction, with nothing to reset.
	const [ loadedUrl, setLoadedUrl ] = useState( '' );
	const [ failedUrl, setFailedUrl ] = useState( '' );
	const avatarLoaded = Boolean( avatarUrl ) && loadedUrl === avatarUrl;
	const avatarFailed = Boolean( avatarUrl ) && failedUrl === avatarUrl;
	// An image the browser already holds can be `complete` before any listener could see its
	// `load`, so the mount checks once instead of waiting for an event that may have passed.
	const revealIfComplete = useCallback( ( img ) => {
		if ( img && img.complete && img.naturalWidth > 0 ) {
			setLoadedUrl( img.getAttribute( 'src' ) || '' );
		}
	}, [] );
	const [ saving, setSaving ] = useState( false );
	const [ fieldError, setFieldError ] = useState( {} );
	const bodyRef = useRef( null );
	// A refusal counter plus what to say about it — see the Service editor for the reasoning.
	// An effect, not `requestAnimationFrame`: an embedded or backgrounded browser pane throttles
	// rAF to never, and round-3 QA caught the focus simply not happening (round-3 QA).
	const [ errorToken, setErrorToken ] = useState( 0 );
	const errorPlan = useRef( {} );
	useFocusFirstError( errorToken, bodyRef, errorPlan );
	// The work-hours half-save is the other thing that has to move the operator, and it targets
	// a control the field-error helper knows nothing about, so it gets its own effect.
	const [ hoursErrorToken, setHoursErrorToken ] = useState( 0 );
	const hoursErrorAt = useRef( null );
	// Pending Work-hours edits, published by WorkHoursSection as `{ dirty, save }`
	// so the page-level Save can flush them (see saveDetails).
	const workHoursRef = useRef( null );
	// D-R63 fix round 1: ONE location read per editor, shared by the Services and Work hours cards
	// (ALL statuses — the Services card names archived branches too; Work hours tabs only the
	// active ones). Per editor rather than per session, so a branch created a minute ago is here.
	const [ locations, setLocations ] = useState( [] );
	useEffect( () => {
		if ( creating ) {
			return undefined;
		}
		let live = true;
		fetchLocations().then( ( { items } ) => { if ( live && items.length ) setLocations( items ); } );
		return () => { live = false; };
	}, [ creating ] );
	const activeBranches = useMemo( () => activeLocations( locations ), [ locations ] );

	/**
	 * Whether this editor holds unsaved edits — the details form OR either sub-section that keeps
	 * a draft of its own.
	 *
	 * Reported UP rather than guarded here: `routes/Staff.jsx` owns both guards, because it is the
	 * component that decides which surface is on screen (the workspace opens from LOCAL STATE
	 * without touching the hash) and it is the one that survives a same-route move. The unmount
	 * report is what makes closing the editor, or discarding onto another record, clear the guard.
	 */
	const dirty = JSON.stringify( details ) !== baseline || hoursDirty || timeOffDirty;
	useEffect( () => {
		onDirtyChange?.( dirty );
	}, [ dirty, onDirtyChange ] );
	useEffect( () => () => onDirtyChange?.( false ), [ onDirtyChange ] );

	// Cancel asks the same question the nav guards ask. It used to close outright: one click, and a
	// half-filled profile was gone with no request, no toast and no way back (handoff §4).
	const leave = async () => {
		if ( dirty && ! ( await confirm( discardPrompt() ) ) ) {
			return;
		}
		onClose?.();
	};

	// D-R55: "Public profile" is a first-class card now, so it earns a nav anchor —
	// SPEC §7.5's four anchors become five.
	//
	// "Calendar connections" is the sixth, and it is CONDITIONAL (founder QA 2026-09-21,
	// superseding D-R55's "stays un-anchored"). The original worry was a nav entry that comes
	// and goes; in practice `perStaffIntegrations()` reads the boot catalog, which is fixed for
	// the life of the page and changes only when an operator installs or enables a module — so
	// on any given site the nav is stable, and a card with no nav entry is the more confusing of
	// the two. Six cards, six anchors.
	const anchors = creating
		? [ [ 'details', 'Details' ], [ 'profile', 'Public profile' ] ]
		: [
			[ 'details', 'Details' ],
			[ 'profile', 'Public profile' ],
			...( perStaffIntegrations().length ? [ [ 'connections', 'Calendar connections' ] ] : [] ),
			[ 'services', 'Services' ],
			[ 'hours', 'Work hours' ],
			[ 'timeoff', 'Time off' ],
		];

	// Sticky section nav + scroll spy, shared with the Service editor (`lib/section-nav.js`).
	// The IntersectionObserver band this replaces could not select a card shorter than itself,
	// and could never reach the last one (founder QA 2026-09-21).
	const { active, scrollTo } = useSectionNav( { anchors, bodyRef, prefix: 'staff-' } );

	/**
	 * Focus the work-hours control a failed page Save named.
	 *
	 * An effect rather than a scheduler, for the same reason the field-error one is: the DOM is
	 * committed by the time it runs, and it cannot be throttled away. The locator comes from
	 * `validateWeekly()` via the rejected `flushScope()`; without one — a SERVER refusal, which names
	 * no period — it falls back to the first control in the card, which is still the right place
	 * to be looking.
	 */
	useEffect( () => {
		if ( ! hoursErrorToken ) {
			return;
		}
		const at = hoursErrorAt.current || {};
		const card = bodyRef.current?.querySelector( '#staff-hours' );
		const period = null !== at.weekday && null !== at.period
			? card?.querySelector( `.ap-hours-period[data-weekday="${ at.weekday }"][data-period="${ at.period }"]` )
			: null;
		const target = ( period || card )?.querySelector( 'select, input' );
		target?.focus?.( { preventScroll: true } );
	}, [ hoursErrorToken ] );

	const set = ( key ) => ( e ) => setDetails( ( d ) => ( { ...d, [ key ]: e.target.value } ) );

	/**
	 * Open the WordPress media modal for the profile photo (D-R51).
	 *
	 * `wp.media` is already on this screen — `AdminPage` calls `wp_enqueue_media()` for the
	 * Aponto page and nothing else, originally for the service editor's featured image — so
	 * this adds no dependency and no bytes to the lazy Staff chunk. The library is filtered to
	 * images because the server answers `422` for anything that is not one.
	 *
	 * Degrades with a toast rather than a dead button when `wp.media` is missing: a plugin that
	 * dequeues media scripts is not a reason to render a control that silently does nothing.
	 */
	const pickAvatar = () => {
		if ( ! window.wp?.media ) {
			showToast( __( 'The media library is unavailable on this screen.', 'aponto' ), 'danger' );
			return;
		}
		const frame = window.wp.media( {
			title: __( 'Select a profile photo', 'aponto' ),
			button: { text: __( 'Use photo', 'aponto' ) },
			multiple: false,
			library: { type: 'image' },
		} );
		frame.on( 'select', () => {
			const attachment = frame.state().get( 'selection' ).first().toJSON();
			setDetails( ( d ) => ( { ...d, avatar_id: attachment.id } ) );
			setAvatarUrl( attachment.sizes?.thumbnail?.url || attachment.url || '' );
			setAvatarSource( 'upload' );
			setFailedUrl( '' );
		} );
		frame.open();
	};

	/**
	 * Remove the UPLOAD, revealing whatever the chain answers underneath.
	 *
	 * The editor cannot know the Gravatar URL before the server resolves it, so it shows the
	 * letter avatar and says so rather than guessing: the next save re-reads the DTO and the
	 * real answer — Gravatar or initials — arrives with it.
	 */
	const clearAvatar = () => {
		setDetails( ( d ) => ( { ...d, avatar_id: null } ) );
		setAvatarUrl( '' );
		setAvatarSource( '' );
		setFailedUrl( '' );
	};

	/**
	 * Adopt the avatar the SERVER resolved on a write.
	 *
	 * The editor only ever sends `avatar_id`; which of the chain's three answers that produces
	 * — upload, verified Gravatar, or nothing — is decided server-side and comes back on the
	 * DTO. Adopting it is what makes "Remove the photo and see the Gravatar underneath" work
	 * without a reload, and it is also how a stale caption corrects itself.
	 *
	 * @param {Object} dto The staff DTO from the create/update response.
	 */
	const applyResolvedAvatar = ( dto ) => {
		if ( ! dto || typeof dto !== 'object' ) {
			return;
		}
		setAvatarUrl( dto.avatar?.url || '' );
		setAvatarSource( dto.avatar?.source || '' );
		setDetails( ( d ) => ( { ...d, avatar_id: dto.avatar_id ?? null } ) );
	};

	// ONLY after the image has loaded: a caption under an empty circle would be telling the
	// operator their staff member has a Gravatar when gravatar.com just answered 404.
	const avatarCaption = ( () => {
		if ( ! avatarLoaded ) {
			return '';
		}
		if ( avatarSource === 'upload' ) {
			return __( 'Uploaded photo', 'aponto' );
		}
		if ( avatarSource === 'gravatar' ) {
			return __( 'From Gravatar', 'aponto' );
		}
		return '';
	} )();

	const bioLength = details.bio.length;
	const canUseMedia = Boolean( config.caps?.media );
	// A URL that already failed is not re-rendered, so it cannot be requested twice.
	const showPhoto = Boolean( avatarUrl ) && ! avatarFailed;
	// One request per press (persona QA 2026-10-05, T-066): `saving` only reaches the button on the
	// next render, so two taps in one frame both posted and "Add staff" created two people.
	const once = useInFlight();
	const saveDetailsNow = async () => {
		const errors = {};
		if ( ! normalizePart( details.first_name ) ) errors.first_name = 'A first name is required.';
		if ( ! /.+@.+\..+/.test( details.email.trim() ) ) errors.email = 'A valid email is required.';
		if ( Object.keys( errors ).length ) {
			setFieldError( errors );
			// Take the operator to the refusal (founder QA 2026-09-21). Same gap the Service
			// editor had, same shared helper: the inline error is invisible when the field is a
			// card or two off-screen, and focus used to stay on Save with nothing announced.
			errorPlan.current = {
				announce: showToast,
				fallback: () => showToast( __( 'Check the highlighted fields.', 'aponto' ), 'danger' ),
			};
			setErrorToken( ( token ) => token + 1 );
			return;
		}
		setSaving( true );
		setFieldError( {} );
		const body = {
			first_name: normalizePart( details.first_name ),
			last_name: normalizePart( details.last_name ),
			email: details.email.trim(),
			phone: details.phone.trim(),
			status: details.status,
			title: details.title.trim(),
			bio: details.bio.trim(),
			is_public: details.is_public,
			avatar_id: details.avatar_id,
		};
		try {
			if ( creating ) {
				const created = await api.post( '/staff', { ...body, type: 'human' } );
				applyResolvedAvatar( created );
				// The details on screen are now the details the server holds, so the editor stops
				// counting as dirty and the nav guard unregisters itself. It matters most on the
				// path that does NOT unmount (the Free single profile, `closeAfterSave = false`),
				// where a stale baseline would keep asking about edits that are already saved.
				setBaseline( JSON.stringify( { ...details, avatar_id: created?.avatar_id ?? null } ) );
				showToast( `${ displayName( body.first_name, body.last_name ) } added.`, 'success' );
				if ( onCreated && created?.id ) {
					// The route keeps the new member open as an editable record (T-077) instead of
					// closing: work hours, time off and their services all need the saved row.
					onSaved?.();
					onCreated( created );
					return;
				}
			} else {
				// CONSUME the response (Codex P3-2). The server resolves the avatar through the
				// D-R51 chain on every write — an email change can reveal a Gravatar, removing
				// an upload can uncover one — and the Free singleton editor does not unmount on
				// save (`closeAfterSave = false`), so a discarded response left the preview
				// showing initials until the operator reloaded the page.
				const saved = await api.patch( `/staff/${ staff.id }`, body );
				applyResolvedAvatar( saved );
				setBaseline( JSON.stringify( { ...details, avatar_id: saved?.avatar_id ?? null } ) );
				// This page is ONE continuous form, so the page Save must also persist a
				// pending Work-hours edit (PUT /staff/{id}/schedule, contract §2.6). It used
				// to save details only and unmount, dropping a Customize edit with no request
				// and no warning — silent data loss reported on the 1.0.0 free zip.
				const hours = workHoursRef.current;
				if ( hours?.dirty ) {
					try {
						await hours.save();
					} catch ( hoursError ) {
						// HALF-SAVE, and it has to be said as one: the details are committed, the
						// schedule is not, and the editor stays open on a record that is now
						// half-written. One toast naming both halves — never two, and never the
						// bare reason, which would read as if nothing had been saved at all.
						showToast(
							sprintf(
								/* translators: %s: the reason the work hours could not be saved. */
								__( 'Staff details saved, but the work hours were not: %s', 'aponto' ),
								hoursError.message
							),
							'danger'
						);
						// …and take the operator to the half that failed (founder QA 2026-09-21,
						// round 2). D-R55 says this page is one continuous form; a page Save that
						// reports a work-hours refusal from the header while leaving the viewport
						// wherever it was is the same "looks like a no-op" defect the field errors
						// had. Through the section-nav path, so the card lands where a nav click
						// would put it and the nav lights it; then into the grid itself — at the
						// EXACT period that failed, since `validateWeekly()` now answers a
						// locator as well as a sentence (round 3).
						scrollTo( 'hours' );
						hoursErrorAt.current = {
							weekday: hoursError.weekday ?? null,
							period: hoursError.period ?? null,
						};
						setHoursErrorToken( ( token ) => token + 1 );
						onSaved?.();
						return;
					}
				}
				showToast( 'Staff updated.', 'success' );
			}
			onSaved?.();
			if ( closeAfterSave ) {
				onClose?.();
			}
		} catch ( err ) {
			if ( err.data?.fields ) {
				setFieldError( err.data.fields );
				// This branch used to be SILENT: a 422 painted a red border and said nothing at
				// all, anywhere, and left focus on Save. One toast carrying the server's own
				// wording (more specific than ours), plus the trip to the field.
				showToast( err.message, 'danger' );
				errorPlan.current = { announce: null };
				setErrorToken( ( token ) => token + 1 );
			} else {
				showToast( err.message, 'danger' );
			}
		} finally {
			// EVERY exit path clears the flag. It used to be cleared only on failure, because success
			// always ended in `onClose()` and the unmount took the state with it. The Free singleton
			// workspace does not close on save (`closeAfterSave={ false }`), so a SUCCESSFUL save left
			// the button disabled at "Saving…" forever — the 1.0.2 beta report. A `finally` is the only
			// form of this that cannot rot again when a new exit path is added.
			setSaving( false );
		}
	};
	const saveDetails = () => once( saveDetailsNow );

	return (
		<div className="pd-page pd-record-editor-page pd-staff-editor-page">
			<header className="pd-record-editor-head">
				<h1>Staff</h1>
				<div className="pd-record-editor-actions">
					<button className="pd-button" type="button" onClick={ leave }>Cancel</button>
					<button className="pd-button primary" type="button" disabled={ saving } onClick={ saveDetails }>{ saving ? 'Saving…' : creating ? 'Add staff' : 'Save details' }</button>
				</div>
			</header>
			<div className="pd-record-editor-layout">
				<aside className="pd-editor-nav" aria-label="Staff editor sections">
					{ anchors.map( ( [ id, label ] ) => (
						<button key={ id } type="button" className={ active === id ? 'is-active' : undefined } aria-current={ active === id ? 'true' : undefined } onClick={ () => scrollTo( id ) }>{ label }</button>
					) ) }
				</aside>
				{ /* `ap-editor-cards` is the D-R55 modifier: it turns the flat, rule-divided
				     sections of `.pd-record-editor-form` into a stack of cards with the Settings
				     page's own gap. The Service editor adopts it by adding the same class and
				     wrapping its sections in `EditorCard` — nothing below is staff-specific. */ }
				<div className="pd-record-editor-form ap-editor-cards" ref={ bodyRef }>
					<EditorCard
						id="staff-details"
						title="Details"
						description="Who this person is in your team, and how you reach them."
					>
						<div className="ap-inspector-identity">
							<span className="pmdk-avatar is-large ap-avatar-mark" aria-hidden="true">
								{ initials( details.first_name, details.last_name ) || '?' }
								{ showPhoto ? <img ref={ revealIfComplete } className={ `ap-avatar-photo${ avatarLoaded ? ' is-loaded' : '' }` } src={ avatarUrl } alt="" width="48" height="48" onLoad={ () => setLoadedUrl( avatarUrl ) } onError={ () => setFailedUrl( avatarUrl ) } /> : null }
							</span>
							<div><strong>{ displayName( details.first_name, details.last_name ) || 'New staff member' }</strong><span className="pd-ltr">{ details.email || 'No email' }</span></div>
						</div>
						<div className="pd-form-grid">
							<label className={ fieldClass( 'pd-compact-field', fieldError, 'first_name' ) }><input name="first_name" value={ details.first_name } placeholder=" " required onChange={ set( 'first_name' ) } { ...fieldAria( 'staff', fieldError, 'first_name' ) } /><span className="pd-compact-label">First name</span></label>
							<label className={ fieldClass( 'pd-compact-field', fieldError, 'last_name' ) }><input name="last_name" value={ details.last_name } placeholder=" " onChange={ set( 'last_name' ) } { ...fieldAria( 'staff', fieldError, 'last_name' ) } /><span className="pd-compact-label">Last name</span></label>
						</div>
						<FieldErrors prefix="staff" fieldError={ fieldError } keys={ [ 'first_name', 'last_name' ] } />
						<div className="pd-form-grid">
							<label className={ fieldClass( 'pd-compact-field', fieldError, 'email' ) }><input className="pd-ltr" type="email" value={ details.email } placeholder=" " required onChange={ set( 'email' ) } { ...fieldAria( 'staff', fieldError, 'email' ) } /><span className="pd-compact-label">Email</span></label>
							<label className={ fieldClass( 'pd-compact-field', fieldError, 'phone' ) }><input className="pd-ltr" value={ details.phone } placeholder=" " onChange={ set( 'phone' ) } { ...fieldAria( 'staff', fieldError, 'phone' ) } /><span className="pd-compact-label">Phone</span></label>
						</div>
						{ /* The email field used to carry a red border and nothing else: a server-side
						     rejection ("that address is already taken") was a colour change with no
						     sentence anywhere on the page. Same treatment as the name field above. */ }
						<FieldErrors prefix="staff" fieldError={ fieldError } keys={ [ 'email', 'phone' ] } />
						<label className={ fieldClass( 'pd-compact-field pd-compact-select is-filled', fieldError, 'status' ) }>
							<select value={ details.status } onChange={ set( 'status' ) } { ...fieldAria( 'staff', fieldError, 'status' ) }>{ STATUS_OPTIONS.map( ( s ) => <option key={ s.value } value={ s.value }>{ s.label }</option> ) }</select>
							<span className="pd-compact-label">Status</span>
							<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
						</label>
						<FieldErrors prefix="staff" fieldError={ fieldError } keys={ [ 'status' ] } />
						{ creating ? <p className="pd-editor-note">Work hours and time off can be set once the staff member is created.</p> : null }
					</EditorCard>

					{ /* PUBLIC PROFILE (D-R51) — its own CARD since D-R55 (it was a sub-heading
					     inside Details), so the operator can see at a glance which fields the
					     customer reads. Ships in BOTH editions — the Free single profile fills
					     exactly the same fields, because the booking form is pixel-identical (§1). */ }
					<EditorCard
						id="staff-profile"
						title="Public profile"
						description="What customers see when they choose a staff member on the booking form."
					>
						<div className={ fieldClass( 'ap-image-field', fieldError, 'avatar_id' ) }>
							<span className="ap-avatar-thumb is-empty ap-avatar-mark" aria-hidden="true">
								{ initials( details.first_name, details.last_name ) || '?' }
								{ showPhoto ? <img ref={ revealIfComplete } className={ `ap-avatar-photo${ avatarLoaded ? ' is-loaded' : '' }` } src={ avatarUrl } alt="" width="52" height="52" onLoad={ () => setLoadedUrl( avatarUrl ) } onError={ () => setFailedUrl( avatarUrl ) } /> : null }
							</span>
							<div className="ap-image-actions">
								{ /* The media modal needs WordPress's own `upload_files`, which
								     `aponto_manage_staff` does not imply. Without it the button
								     would open an empty frame, so it is hidden — but Remove
								     stays, because clearing `avatar_id` is a staff write and
								     needs no media rights (Codex P2-3). */ }
								{ canUseMedia ? <button className="pd-button sm" type="button" onClick={ pickAvatar } { ...fieldAria( 'staff', fieldError, 'avatar_id' ) }>{ details.avatar_id ? 'Replace photo' : 'Choose photo' }</button> : null }
								{ details.avatar_id ? <button className="pd-button text sm" type="button" onClick={ clearAvatar }>Remove</button> : null }
								{ avatarCaption ? <span className="ap-image-source">{ avatarCaption }</span> : null }
								{ ! canUseMedia && ! details.avatar_id ? <span className="ap-image-source">Your account cannot upload media.</span> : null }
							</div>
						</div>
						<FieldErrors prefix="staff" fieldError={ fieldError } keys={ [ 'avatar_id' ] } />
						<p className="pd-editor-note">Without a photo we use this person&rsquo;s Gravatar if they have one, otherwise their initials.</p>

						<label className={ fieldClass( 'pd-compact-field', fieldError, 'title' ) }><input value={ details.title } placeholder=" " maxLength={ TITLE_MAX } onChange={ set( 'title' ) } { ...fieldAria( 'staff', fieldError, 'title' ) } /><span className="pd-compact-label">Job title</span></label>
						<FieldErrors prefix="staff" fieldError={ fieldError } keys={ [ 'title' ] } />
						<p className="pd-editor-note">Shown under the name on the booking form, e.g. Senior Stylist.</p>

						<label className={ fieldClass( 'pd-compact-field pd-compact-notes', fieldError, 'bio' ) }><textarea value={ details.bio } placeholder=" " rows={ 3 } maxLength={ BIO_MAX } onChange={ set( 'bio' ) } { ...fieldAria( 'staff', fieldError, 'bio' ) } /><span className="pd-compact-label">Short bio</span></label>
						<FieldErrors prefix="staff" fieldError={ fieldError } keys={ [ 'bio' ] } />
						<p className="pd-editor-note">
							Optional. A sentence or two customers will see.
							{ ' ' }
							{ /* A live count, not a hard client-side truncation: the server
							     refuses an over-long bio rather than storing half of it, so the
							     counter has to say the same number the 422 would. */ }
							<span className={ bioLength > BIO_MAX ? 'ap-field-error' : undefined }>{ `${ bioLength } / ${ BIO_MAX }` }</span>
						</p>

						<label className={ fieldClass( 'pd-notify-toggle', fieldError, 'is_public' ) }>
							<input className="pd-table-checkbox" type="checkbox" checked={ details.is_public } onChange={ ( e ) => setDetails( ( d ) => ( { ...d, is_public: e.target.checked } ) ) } { ...fieldAria( 'staff', fieldError, 'is_public' ) } />
							<span>Show on booking form</span>
						</label>
						<FieldErrors prefix="staff" fieldError={ fieldError } keys={ [ 'is_public' ] } />
						<p className="pd-editor-note">When off, customers can&rsquo;t pick this staff member by name, but they can still be assigned automatically.</p>
					</EditorCard>

					{ ! creating ? <CalendarConnections staffId={ staff.id } /> : null }

					{ ! creating ? (
						<>
							<ServicesSection staffId={ staff.id } staffName={ displayName( details.first_name, details.last_name ) } locations={ locations } />
							<WorkHoursSection staffId={ staff.id } showToast={ showToast } saveRef={ workHoursRef } onDirtyChange={ setHoursDirty } locations={ activeBranches } />
							<TimeOffSection staffId={ staff.id } showToast={ showToast } onDirtyChange={ setTimeOffDirty } />
						</>
					) : null }
					<footer className="pd-editor-footer">
						<button className="pd-button" type="button" onClick={ leave }>Cancel</button>
						<button className="pd-button primary" type="button" disabled={ saving } onClick={ saveDetails }>{ saving ? 'Saving…' : creating ? 'Add staff' : 'Save details' }</button>
					</footer>
				</div>
			</div>
			{ dialog }
		</div>
	);
}

/**
 * Tone per service status, in the `.ap-txn-status` vocabulary this admin already uses.
 *
 * A service that is not `active` is not a failure — a draft is a normal working state — so the
 * only `warning` is `archived`, which is the one that means "this assignment can no longer be
 * booked".
 */
const SERVICE_STATUS_TONE = {
	active: 'positive',
	draft: 'neutral',
	archived: 'warning',
};

/**
 * The operator-facing label for a service status, or `''` when it is unknown.
 *
 * Empty for a status the catalog fetch could not resolve (an archived service past the 100-row
 * window, say): the row still names the service, and inventing a label for a value we do not
 * have would be worse than saying nothing.
 *
 * @param {string} status Raw status.
 * @return {string} Label, or an empty string.
 */
function serviceStatusLabel( status ) {
	switch ( status ) {
		case 'active':
			return __( 'Active', 'aponto' );
		case 'draft':
			return __( 'Draft', 'aponto' );
		case 'archived':
			return __( 'Archived', 'aponto' );
		default:
			return '';
	}
}

/**
 * The integration modules this build configures PER STAFF MEMBER.
 *
 * `scope`, not `category` (D-R65, founder-approved 2026-09-21). The first fix for this filter
 * replaced bare `kind: integration` — which listed "Stripe payments: Not connected · Manage" on a
 * STAFF editor — with the `connections` CATEGORY, and that was only accidentally right. The
 * connections tab is a browsing tab, and it also holds `sms` and `webhooks`: both are one
 * site-wide configuration, and both would have appeared once per staff member the day they ship.
 * `scope === 'per_staff'` is the registry asking the question this card actually has ("is this
 * module configured per PERSON?"), so the list stays generic — a new calendar or video provider
 * appears here for free, and no site-level module ever can.
 *
 * Lifted out of {@see CalendarConnections} so the editor's NAV can ask the same question the
 * CARD does (founder QA 2026-09-21): the anchor must be present exactly when the card is, and
 * two copies of this predicate would be two chances to disagree. Reads the boot catalog, which
 * is a page-load constant — no request, and stable for the life of the editor.
 *
 * @return {Array<Object>} Module rows, possibly empty.
 */
function perStaffIntegrations() {
	return ( config.modules || [] ).filter(
		( mod ) =>
			'integration' === mod.kind &&
			'per_staff' === mod.scope &&
			mod.available &&
			mod.has_settings
	);
}

// --- Calendar connections (read-only) ----------------------------------------
/**
 * One read-only line per AVAILABLE calendar integration, saying whether this staff member is
 * connected and linking to the module panel where that is changed.
 *
 * Read-only on purpose, and the reason is the same one the Services section states: the connect
 * flow leaves the site for a third-party consent screen and comes back to a specific panel. Putting
 * a second entry point here would mean two places that can start the same handshake and two places
 * to keep truthful — while the thing an editor actually needs is the ANSWER ("is this person's
 * calendar linked?"), which is exactly one line.
 *
 * Generic over the registry rather than hardcoded to Google: any per-staff `kind: integration`
 * module the build can use appears here, so the Outlook module gets this surface for free (D-R35)
 * and `video_links` will too (D-R65).
 *
 * Reads the boot-data projection, which carries no token — only status, account label and the
 * timestamp (D-R34).
 *
 * @param {{staffId: number}} props Section props.
 */
function CalendarConnections( { staffId } ) {
	const integrations = perStaffIntegrations();

	if ( ! integrations.length ) {
		return null;
	}

	return (
		// Its own CARD since D-R55 (it was a sub-heading at the end of Details). Card and list
		// are rendered TOGETHER, so a site with no calendar module shows neither — which is
		// also why this section owns no nav anchor.
		<EditorCard
			id="staff-connections"
			title={ __( 'Calendar connections', 'aponto' ) }
			description={ __( 'Whether this person’s own calendar is linked. Connecting and disconnecting happen on the module’s page.', 'aponto' ) }
		>
			<ul className="ap-staff-integrations">
			{ integrations.map( ( mod ) => {
				const rows = config.integration.connections[ mod.code ] || [];
				const row = rows.find( ( entry ) => Number( entry.staff_id ) === Number( staffId ) );
				const label = MODULE_META[ mod.code ]?.label || mod.code;
				// Three answers, three tones — the same text-tone vocabulary the payments
				// transaction list uses (`.ap-txn-status`), not a fourth badge component.
				let state = __( 'Not connected', 'aponto' );
				let tone = 'neutral';
				if ( row && 'needs_reconnect' === row.status ) {
					state = __( 'Needs reconnect', 'aponto' );
					tone = 'warning';
				} else if ( row ) {
					tone = 'positive';
					state = row.account
						? sprintf(
								/* translators: %s: the connected account address. */
								__( 'Connected as %s', 'aponto' ),
								row.account
						  )
						: __( 'Connected', 'aponto' );
				}

				return (
					<li key={ mod.code }>
						<span className="ap-staff-integration-name">{ label }</span>
						<span className={ `ap-staff-integration-state is-${ tone }` }>{ state }</span>
						<a href={ `#modules/${ mod.code }` }>{ __( 'Manage', 'aponto' ) }</a>
					</li>
				);
			} ) }
			</ul>
		</EditorCard>
	);
}

// --- Services (read-only eligibility) ----------------------------------------
/**
 * The services this staff member is eligible for. Two reads: `GET /staff/{id}` for the additive
 * `service_ids` (D-R28) and the services catalog for their names — the ids alone would render a
 * list of numbers. Both are best-effort: a failed catalog read degrades to "Service #12" rather
 * than blanking a section the rest of the page does not depend on.
 *
 * Read-only by design (see the file header): the edit lives in the service editor, which owns the
 * full-replacement PUT. The link therefore goes there, via `#services/<id>` (routes/Services.jsx).
 *
 * @param {{staffId: number, staffName: string}} props Section props.
 */
function ServicesSection( { staffId, staffName, locations = [] } ) {
	const [ state, setState ] = useState( { loading: true, services: [] } );
	// D-R63: with ≥1 location, each line also says WHERE ("· Downtown, Uptown" / "· Every
	// location"), read from that service's own eligibility pairs — best-effort, one read per listed
	// service, and none at all on a site without locations.
	const [ scopes, setScopes ] = useState( {} );
	const hasLocations = locations.length > 0;

	useEffect( () => {
		if ( ! hasLocations || state.loading ) {
			return undefined;
		}
		let live = true;
		state.services.forEach( ( svc ) => {
			api.get( `/services/${ svc.id }/eligibility` )
				.then( ( res ) => { if ( live ) setScopes( ( all ) => ( { ...all, [ svc.id ]: memberLocationIds( res.assignments, staffId ) } ) ); } )
				.catch( () => {} );
		} );
		return () => { live = false; };
	}, [ hasLocations, state, staffId ] );

	useEffect( () => {
		let live = true;
		Promise.all( [
			api.get( `/staff/${ staffId }` ),
			api.get( '/services', { status: 'all', per_page: 100 } ).catch( () => ( { items: [] } ) ),
		] )
			.then( ( [ staffDto, catalog ] ) => {
				if ( ! live ) {
					return;
				}
				const byId = Object.fromEntries( ( catalog.items || [] ).map( ( svc ) => [ String( svc.id ), svc ] ) );
				// A staff member may be connected to a service the catalog page did not return
				// (archived, or past the 100-row window). Keep the row — dropping it would
				// under-report a real assignment — and label it from the id.
				const services = ( staffDto.service_ids || [] ).map( ( id ) => ( {
					id,
					name: byId[ String( id ) ]?.name || sprintf(
						/* translators: %d: the numeric id of a service that could not be resolved to a name. */
						__( 'Service #%d', 'aponto' ),
						id
					),
					status: byId[ String( id ) ]?.status || '',
				} ) );
				setState( { loading: false, services } );
			} )
			.catch( () => {
				if ( live ) {
					setState( { loading: false, services: [] } );
				}
			} );
		return () => { live = false; };
	}, [ staffId ] );

	return (
		<EditorCard
			id="staff-services"
			title="Services"
			// The card header is where the one-line "why is this read-only" note lives now
			// (D-R55); it used to sit above the list and therefore vanish with it.
			description={ __( 'Assignments are edited on the service, under “Staff & locations”.', 'aponto' ) }
		>
			{ state.loading ? <p className="pd-editor-note">Loading…</p> : state.services.length ? (
				// The admin's standard list rows, the same anatomy the Calendar connections
				// card uses: hairline-separated, name first, the escape hatch at the inline
				// end. It used to be one 44px bordered box per service whose only text was
				// body-coloured and underline-free — which reads as a DISABLED INPUT, not as a
				// link to that service (founder QA 2026-09-21). The link is the row's action
				// now, carries the admin's accent, and names what it does.
				<ul className="ap-staff-services-list">
					{ state.services.map( ( svc ) => (
						<li key={ svc.id }>
							{ /* With locations the name line also says WHERE (D-R63); without, it is the
							     bare name it has always been. */ }
							{ locations.length ? (
								<span className="ap-staff-service-name">
									{ svc.name }
									{ scopes[ svc.id ] ? <span className="ap-image-source">{ ` · ${ locationScopeLabel( scopes[ svc.id ], locations, __( 'Every location', 'aponto' ) ) }` }</span> : null }
								</span>
							) : <span className="ap-staff-service-name">{ svc.name }</span> }
							{ /* The status as TONED TEXT, for every row (founder QA 2026-09-21,
							     round 2). It used to render only for a non-active service, so on
							     a healthy site the middle of the row was simply empty and the
							     status read as missing. The vocabulary is the one the Calendar
							     connections rows beside it use (`.ap-txn-status` tones) rather
							     than a pill, for the same reason stated there. The value comes
							     from the catalog this section already fetched — no per-row
							     request — and is omitted when that fetch could not resolve it. */ }
							{ serviceStatusLabel( svc.status ) ? (
								<span className={ `ap-staff-service-state is-${ SERVICE_STATUS_TONE[ svc.status ] }` }>
									{ serviceStatusLabel( svc.status ) }
								</span>
							) : null }
							<a href={ `#services/${ svc.id }` }>
								{ sprintf(
									/* translators: %s: the service name. */
									__( 'Edit %s', 'aponto' ),
									svc.name
								) }
							</a>
						</li>
					) ) }
				</ul>
			) : (
				// The unbookable state, stated plainly. On premium a new service starts with NO
				// eligible staff (the Free policy auto-assigns; the extension does not), so
				// an empty list here is a real, reachable configuration — not an edge case.
				<p className="pd-editor-note">
					{ sprintf(
						/* translators: %s: the staff member's name. */
						__( '%s is not assigned to any service yet, so they cannot be booked. Open a service and add them under “Staff & locations”.', 'aponto' ),
						staffName || __( 'This staff member', 'aponto' )
					) }
				</p>
			) }
		</EditorCard>
	);
}

// --- Work hours -------------------------------------------------------------
/** A scope before its GET: nothing known, so nothing dirty (`baseline: null`). */
const EMPTY_SCOPE = { loading: true, loaded: false, custom: false, weekly: {}, overrides: [], baseline: null };

/**
 * Work hours — one card, one or more SCOPES (D-R63).
 *
 * With no active location the card is exactly what it has always been: the wildcard scope
 * ("All locations", `location_id = 0`), an inherited business-hours summary, Customize and Revert.
 * With ≥1 active location a tab row appears — "All locations" plus one tab per branch — and each
 * branch is an independent scope over `GET`/`PUT /staff/{id}/schedule?location_id=N` (weight-5
 * rows, rest-contract §2.6 addendum 2026-09-23). A branch with no rows INHERITS and shows the
 * RESOLVED grid at that branch (`resolved=1&location_id=N`) — what the public grid will use —
 * with Customize (deep-copies that resolved grid) and "Copy hours from…"; a branch with rows is
 * the editable grid plus "Revert to inherited", which PUTs `weekly: []` for that scope only.
 *
 * Every scope keeps its own draft and dirty state; the page Save flushes EVERY dirty scope, one
 * after the other, through the one write queue (`saveRef` keeps its `{ dirty, save }` shape), and
 * the D-R58 guards see the union through `onDirtyChange`.
 */
function WorkHoursSection( { staffId, showToast, saveRef, onDirtyChange, locations = [] } ) {
	const { confirm, dialog } = useConfirmDialog();
	const business = businessWeeklyMap();
	// `locations` = the ACTIVE branches, read once by the editor. Empty = no tab row and no branch
	// request: the card is the pre-D-R63 card.
	const [ scopeId, setScopeId ] = useState( 0 );
	// Location id → `{ loading, loaded, custom, weekly, overrides, baseline }`.
	const [ scopes, setScopes ] = useState( { 0: EMPTY_SCOPE } );
	// Branch id → the RESOLVED weekly (contract rows) at that branch, or `null` when the read
	// failed. Cleared after every successful write: any write can change what a branch inherits.
	const [ inherited, setInherited ] = useState( {} );
	const [ saving, setSaving ] = useState( false );
	const branchesRequested = useRef( false );

	const loadScope = useCallback( ( id ) => {
		setScopes( ( all ) => ( { ...all, [ id ]: { ...( all[ id ] || EMPTY_SCOPE ), loading: true } } ) );
		// No query for the wildcard scope, so a site with no locations sends today's exact request.
		return api.get( `/staff/${ staffId }/schedule`, id ? { location_id: id } : undefined )
			.then( ( res ) => {
				const map = weeklyMap( res.weekly );
				setScopes( ( all ) => ( {
					...all,
					[ id ]: {
						loading: false,
						loaded: true,
						custom: ( res.weekly || [] ).length > 0,
						weekly: map,
						overrides: res.overrides || [],
						baseline: JSON.stringify( weeklyRows( map ) ),
					},
				} ) );
			} )
			.catch( () => setScopes( ( all ) => ( { ...all, [ id ]: { ...( all[ id ] || EMPTY_SCOPE ), loading: false } } ) ) );
	}, [ staffId ] );

	useEffect( () => {
		loadScope( 0 );
	}, [ loadScope ] );

	// The first time a BRANCH tab opens, read every branch scope once — the copy-from list needs to
	// know which branches have their own rows. Never before: a member nobody looks at per branch
	// costs exactly the one wildcard read it always did.
	useEffect( () => {
		if ( ! scopeId || branchesRequested.current ) {
			return;
		}
		branchesRequested.current = true;
		locations.forEach( ( location ) => loadScope( location.id ) );
	}, [ scopeId, locations, loadScope ] );

	// The inherited grid of the open branch tab, read on demand and again after any write.
	useEffect( () => {
		if ( ! scopeId || Object.prototype.hasOwnProperty.call( inherited, scopeId ) ) {
			return undefined;
		}
		let live = true;
		api.get( `/staff/${ staffId }/schedule`, { resolved: 1, location_id: scopeId } )
			.then( ( res ) => { if ( live ) setInherited( ( all ) => ( { ...all, [ scopeId ]: res.weekly || [] } ) ); } )
			.catch( () => { if ( live ) setInherited( ( all ) => ( { ...all, [ scopeId ]: null } ) ); } );
		return () => { live = false; };
	}, [ scopeId, inherited, staffId ] );

	// The section's write queue. `PUT /staff/{id}/schedule` is a FULL replacement of one scope and
	// the last writer wins. (The server serializes and commits each replacement atomically since
	// persona QA 2026-10-05, T-065 — the queue is what keeps the ORDER the operator chose and the
	// reload after each write honest; Codex review item 1.) Every write path — a
	// scope's own Save, Revert, and the page-level Save for each dirty scope — goes through
	// `persist`, which chains onto whatever is already in flight instead of racing it.
	const writeQueue = useRef( Promise.resolve() );
	const queued = useRef( 0 );

	// The one write path (PUT /staff/{id}/schedule, contract §2.6). It REJECTS on failure so every
	// caller decides how to surface it — the page-level Save must be able to tell the user the
	// details saved but the hours did not. `location_id` rides the body only for a branch scope, so
	// the wildcard payload is byte-identical to the pre-D-R63 one.
	const persist = ( id, nextWeekly, overrides ) => {
		const payload = {
			weekly: weeklyRows( nextWeekly ),
			overrides: ( overrides || [] ).map( ( o ) => ( { date: o.date, periods: o.periods } ) ),
		};
		if ( id ) {
			payload.location_id = id;
		}
		// Busy from the moment a write is QUEUED until the last one settles — a write waiting
		// its turn must keep the grid inert exactly like the one on the wire.
		queued.current += 1;
		setSaving( true );
		const run = async () => {
			try {
				await api.put( `/staff/${ staffId }/schedule`, payload );
				setInherited( {} );
				await loadScope( id );
			} finally {
				// Always drop the saving flag — leaving it set after a SUCCESSFUL save
				// kept the button stuck at a disabled "Saving…" (found in B4b verify).
				queued.current -= 1;
				if ( 0 === queued.current ) {
					setSaving( false );
				}
			}
		};
		// `then( run, run )` so a FAILED write still lets the next one run (a poisoned queue
		// would wedge the section until remount); the queue itself swallows rejections while
		// the caller keeps the real one.
		const chained = writeQueue.current.then( run, run );
		writeQueue.current = chained.catch( () => {} );

		return chained;
	};

	// The section's own buttons own their toasts; the page-level Save writes its own
	// message instead (it has to mention the details that DID save).
	const withToast = async ( write ) => {
		try {
			await write();
			showToast( 'Work hours saved.', 'success' );
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	const scope = scopes[ scopeId ] || EMPTY_SCOPE;
	const allScope = scopes[ 0 ] || EMPTY_SCOPE;
	const branch = locations.find( ( location ) => location.id === scopeId ) || null;
	const branchName = ( id ) => locations.find( ( location ) => location.id === id )?.name || '';

	const setScopeWeekly = ( id, weekly, extra = {} ) =>
		setScopes( ( all ) => ( { ...all, [ id ]: { ...( all[ id ] || EMPTY_SCOPE ), weekly, ...extra } } ) );

	// Customize opens the editor LOCALLY and persists only on "Save work hours" — no empty
	// write-then-revert round-trip (U4-03b). All locations deep-copies the business hours (and keeps
	// the legacy Mon–Fri 09:00–17:00 seed for a site with none configured). A branch copies the
	// RESOLVED grid at that branch VERBATIM — a week closed there stays closed (D-R63 fix round 1) —
	// and is only offered once that grid was actually read (see the header action below).
	const customize = () => {
		if ( scopeId ) {
			const resolved = inherited[ scopeId ];
			if ( ! Array.isArray( resolved ) ) {
				return;
			}
			setScopeWeekly( scopeId, seedWeekly( periodsByWeekday( resolved ), { fallback: false } ), { custom: true } );
			return;
		}
		setScopeWeekly( 0, seedWeekly( business ), { custom: true } );
	};

	// "Copy hours from…" (branch tabs): a verbatim deep copy of the source scope's week — All
	// locations' own rows, or the business hours it inherits — opened as this branch's unsaved draft.
	const copyFrom = ( sourceId ) => {
		const source = scopes[ sourceId ] || EMPTY_SCOPE;
		const weekly = source.custom ? cloneWeekly( source.weekly ) : seedWeekly( business, { fallback: false } );
		setScopeWeekly( scopeId, weekly, { custom: true } );
	};

	// Validate + write ONE scope's pending grid. Rejects (never toasts) so the caller owns the
	// message; a branch's error names the branch, because the page Save may be flushing several.
	//
	// The rejection carries the LOCATOR as well as the sentence (founder QA 2026-09-21, round 3):
	// `validateWeekly()` answers `{ message, weekday, index }`, and the page Save uses those two
	// numbers to focus the control that is actually wrong instead of the first one in the card.
	// Attached to the Error rather than thrown as a bare object so every existing `catch` that
	// reads `.message` keeps working untouched. A locator is only meaningful in the grid on
	// screen, so a branch scope that fails validation opens its own tab first (D-R63 tabs).
	const flushScope = async ( id ) => {
		const target = scopes[ id ];
		const invalid = validateWeekly( target.weekly );
		if ( invalid ) {
			if ( id !== scopeId ) {
				setScopeId( id );
			}
			const error = new Error( id ? `${ branchName( id ) }: ${ invalid.message }` : invalid.message );
			error.weekday = invalid.weekday;
			error.period = invalid.index;
			throw error;
		}
		try {
			await persist( id, target.weekly, target.overrides );
		} catch ( err ) {
			throw new Error( id ? `${ branchName( id ) }: ${ err.message }` : err.message );
		}
	};

	// ONE pending-edit signature per scope, read by the page Save (through `saveRef`) and by the
	// dirty guards (through `onDirtyChange`) as their UNION. A scope whose GET failed has a null
	// baseline and can neither look dirty nor be flushed over a schedule nobody read.
	const dirtyIds = dirtyScopeIds( scopes );
	const dirty = dirtyIds.length > 0;

	// The page Save flushes every dirty scope in order, All locations first. Sequential on purpose:
	// the queue would serialise them anyway, and stopping at the first failure means the toast
	// names the one scope that did not save instead of a pile of them.
	const flushAll = async () => {
		for ( const id of dirtyIds ) {
			await flushScope( id ); // eslint-disable-line no-await-in-loop
		}
	};

	// Publish the pending edit to StaffWorkspace so its Save can flush this sub-resource
	// (the page is one continuous form). Without this the grid state died on unmount:
	// no PUT, no error — the 1.0.0 free-zip beta bug. Re-registered every render so the
	// closure over the scopes is never stale.
	useEffect( () => {
		if ( ! saveRef ) {
			return undefined;
		}
		const handle = { dirty, save: flushAll };
		saveRef.current = handle;
		return () => {
			if ( saveRef.current === handle ) {
				saveRef.current = null;
			}
		};
	} );

	// …and report the SAME fact up as state, because a ref cannot re-render the guard that has to
	// act on it. Keyed, so it does not fire on every render of this section.
	useEffect( () => {
		onDirtyChange?.( dirty );
	}, [ dirty, onDirtyChange ] );
	useEffect( () => () => onDirtyChange?.( false ), [ onDirtyChange ] );

	const saveWeekly = () => withToast( () => flushScope( scopeId ) );

	const revert = async () => {
		// In-app dialog (C13 / review F item 3): destructive styling, Cancel takes default focus.
		const ok = await confirm( scopeId ? {
			title: sprintf(
				/* translators: %s: location name. */
				__( 'Revert %s to inherited hours?', 'aponto' ),
				branchName( scopeId )
			),
			message: __( 'The custom hours for this location will be removed, and it will use the inherited hours again.', 'aponto' ),
			confirmText: __( 'Revert', 'aponto' ),
			destructive: true,
		} : {
			title: 'Revert to business hours?',
			message: 'Custom weekly hours will be removed (date overrides are kept).',
			confirmText: 'Revert',
			destructive: true,
		} );
		if ( ! ok ) {
			return;
		}
		const id = scopeId;
		const overrides = scope.overrides;
		setScopeWeekly( id, {}, { custom: false } );
		// `weekly: []` — an EMPTY list, not seven closed days — deletes the scope's weekly rows
		// (rest-contract §2.6 addendum point 4); its date overrides ride back untouched.
		withToast( () => persist( id, {}, overrides ) );
	};

	const hasBranches = locations.length > 0;
	// WAI-ARIA tabs: one tab in the tab order (roving tabindex), arrows move between them — mirrored
	// under `dir="rtl"`, where the NEXT tab is to the left — and Home/End jump to the ends.
	const tabIds = [ 0, ...locations.map( ( location ) => location.id ) ];
	const onTabKey = ( e ) => {
		const rtl = 'rtl' === e.currentTarget.closest( '[dir]' )?.getAttribute( 'dir' );
		const index = tabIds.indexOf( scopeId );
		const moves = {
			ArrowRight: rtl ? -1 : 1,
			ArrowLeft: rtl ? 1 : -1,
			Home: -index,
			End: tabIds.length - 1 - index,
		};
		if ( ! ( e.key in moves ) ) {
			return;
		}
		e.preventDefault();
		const next = tabIds[ ( index + moves[ e.key ] + tabIds.length ) % tabIds.length ];
		setScopeId( next );
		e.currentTarget.querySelector( `#staff-hours-tab-${ next }` )?.focus();
	};
	const tabs = hasBranches ? (
		// eslint-disable-next-line jsx-a11y/interactive-supports-focus -- the TABS are focusable (roving tabindex); the list only routes their arrow keys.
		<div className="pd-section-tabs" role="tablist" aria-label={ __( 'Work hours location', 'aponto' ) } onKeyDown={ onTabKey }>
			{ [ { id: 0, name: __( 'All locations', 'aponto' ) }, ...locations ].map( ( tab ) => (
				<button
					key={ tab.id }
					type="button"
					role="tab"
					id={ `staff-hours-tab-${ tab.id }` }
					aria-selected={ scopeId === tab.id }
					aria-controls="staff-hours-panel"
					tabIndex={ scopeId === tab.id ? 0 : -1 }
					onClick={ () => setScopeId( tab.id ) }
				>
					{ tab.name }
				</button>
			) ) }
		</div>
	) : null;

	if ( allScope.loading && ! allScope.loaded ) {
		return <EditorCard id="staff-hours" title="Work hours" description={ HOURS_DESCRIPTION }><p className="pd-editor-note">Loading…</p></EditorCard>;
	}

	// Header action. Both rewrite the whole week of the open scope, so they are inert while a write
	// is in flight — the same rule the grid itself follows (Codex review item 1).
	// A failed WILDCARD read keeps its pre-D-R63 face (the inherited summary + Customize; its null
	// baseline still keeps the page Save from writing over rows nobody read); a failed BRANCH read
	// says so instead of pretending the branch inherits.
	const usable = scope.loaded || ( ! scopeId && ! scope.loading );
	let action = null;
	if ( usable ) {
		if ( scope.custom ) {
			action = <button type="button" className="pd-section-action" disabled={ saving } onClick={ revert }>{ renderIcon( 'arrows' ) }{ scopeId ? __( 'Revert to inherited', 'aponto' ) : 'Revert to business hours' }</button>;
		} else {
			action = <button type="button" className="pd-section-action" disabled={ saving || ( scopeId > 0 && ! Array.isArray( inherited[ scopeId ] ) ) } onClick={ customize }>{ renderIcon( 'note' ) }Customize</button>;
		}
	}

	const hoursList = ( byDay ) => (
		<ul className="ap-hours-list">
			{ WEEKDAYS.map( ( [ n, label ] ) => (
				<li key={ n }><span>{ label }</span><strong>{ ( byDay[ n ] && byDay[ n ].length ) ? byDay[ n ].map( ( p ) => `${ formatMinutes( p.start_minute, config.settings.timeFormat ) } – ${ formatMinutes( p.end_minute, config.settings.timeFormat ) }` ).join( ', ' ) : 'Closed' }</strong></li>
			) ) }
		</ul>
	);

	let body;
	if ( ! usable ) {
		body = <p className="pd-editor-note">{ scope.loading ? 'Loading…' : __( 'These hours could not be loaded.', 'aponto' ) }</p>;
	} else if ( scope.custom ) {
		body = (
			<div className="ap-hours-grid-wrap">
				<WeeklyHoursGrid weekly={ scope.weekly } onChange={ ( next ) => setScopeWeekly( scopeId, next ) } busy={ saving } timeFormat={ config.settings.timeFormat } />
				<div className="ap-hours-save"><button type="button" className="pd-button primary sm" disabled={ saving } onClick={ saveWeekly }>{ saving ? 'Saving…' : 'Save work hours' }</button></div>
			</div>
		);
	} else if ( ! scopeId ) {
		body = (
			<div className="ap-hours-summary">
				<p className="pd-editor-note">Using your business hours (inherited). Customize to give this staff member their own weekly hours.</p>
				{ hoursList( business ) }
			</div>
		);
	} else {
		const resolved = inherited[ scopeId ];
		const sources = copySourceIds( { scopes, activeId: scopeId, locations } );
		body = (
			<div className="ap-hours-summary">
				<p className="pd-editor-note">
					{ sprintf(
						/* translators: %s: location name. */
						'all' === inheritedSource( allScope )
							? __( 'Using the All locations hours at %s (inherited). Customize to give this staff member their own hours here.', 'aponto' )
							: __( 'Using your business hours at %s (inherited). Customize to give this staff member their own hours here.', 'aponto' ),
						branch?.name || ''
					) }
				</p>
				{ undefined === resolved ? <p className="pd-editor-note">Loading…</p> : null }
				{ null === resolved ? <p className="pd-editor-note">{ __( 'The inherited hours could not be loaded.', 'aponto' ) }</p> : null }
				{ Array.isArray( resolved ) ? hoursList( periodsByWeekday( resolved ) ) : null }
				<label className="pd-compact-field pd-compact-select is-filled">
					<select value="" disabled={ saving } onChange={ ( e ) => { if ( '' !== e.target.value ) copyFrom( Number( e.target.value ) ); } }>
						<option value="">{ __( 'Choose a source…', 'aponto' ) }</option>
						{ sources.map( ( id ) => (
							<option key={ id } value={ id }>{ id ? branchName( id ) : __( 'All locations', 'aponto' ) }</option>
						) ) }
					</select>
					<span className="pd-compact-label">{ __( 'Copy hours from', 'aponto' ) }</span>
					<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
				</label>
			</div>
		);
	}

	return (
		<EditorCard
			id="staff-hours"
			title="Work hours"
			description={ HOURS_DESCRIPTION }
			action={ action }
		>
			{ tabs }
			{ hasBranches ? (
				<div id="staff-hours-panel" role="tabpanel" aria-labelledby={ `staff-hours-tab-${ scopeId }` }>
					{ body }
					{ /* Time off is a blocked period of the PERSON (§2.7), with no branch dimension:
					     a day off at one branch is a day off everywhere, and the card says so where
					     an operator might expect otherwise. */ }
					{ scopeId ? <p className="pd-editor-note">{ __( 'Time off applies at every location.', 'aponto' ) }</p> : null }
				</div>
			) : body }
			{ dialog }
		</EditorCard>
	);
}

// --- Time off (blocked periods) ---------------------------------------------
/**
 * What is wrong with a time-off entry, keyed by the field that has to change (persona QA
 * 2026-10-05, T-069). Empty when the range can be posted.
 *
 * `datetime-local` values (`YYYY-MM-DDTHH:mm`) of one zone order correctly as plain strings, so
 * the comparison needs no date parsing — and so cannot disagree with it across a DST change.
 *
 * @param {{start: string, end: string}} form The two picker values.
 * @return {Object} `{ start?, end? }` messages.
 */
export function timeOffErrors( form ) {
	const errors = {};
	if ( ! form?.start ) {
		errors.start = __( 'Choose when the time off starts.', 'aponto' );
	}
	if ( ! form?.end ) {
		errors.end = __( 'Choose when the time off ends.', 'aponto' );
	} else if ( form.start && form.end <= form.start ) {
		errors.end = __( 'The end must be after the start.', 'aponto' );
	}
	return errors;
}

/**
 * One time-off row's range, in business time (persona QA 2026-10-05, T-068).
 *
 * A block inside one day reads "date · start – end". A block that crosses midnight names BOTH
 * dates: it used to print the start date with the two clock times, so a week off read as
 * "Mon 3 Aug · 9:00 AM – 5:00 PM" — one working day.
 *
 * @param {{start_datetime_utc: string, end_datetime_utc: string}} item Blocked-period DTO.
 * @return {string} Display range.
 */
export function timeOffRangeLabel( item ) {
	const from = `${ longDate( item.start_datetime_utc ) } · ${ timeLabel( item.start_datetime_utc ) }`;
	if ( isoDate( item.start_datetime_utc ) === isoDate( item.end_datetime_utc ) ) {
		return `${ from } – ${ timeLabel( item.end_datetime_utc ) }`;
	}
	return `${ from } – ${ longDate( item.end_datetime_utc ) } · ${ timeLabel( item.end_datetime_utc ) }`;
}

function TimeOffSection( { staffId, showToast, onDirtyChange } ) {
	const [ items, setItems ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ adding, setAdding ] = useState( false );
	const [ form, setForm ] = useState( { start: '', end: '', reason: '' } );

	// A STARTED time-off entry is an unsaved edit too — it is written by its own POST, which the
	// page Save does not make, so leaving the editor drops it. An opened-but-untouched form is
	// not: asking about a form the operator has typed nothing into would be a dialog about
	// nothing.
	const dirty = adding && Boolean( form.start || form.end || form.reason );
	useEffect( () => {
		onDirtyChange?.( dirty );
	}, [ dirty, onDirtyChange ] );
	useEffect( () => () => onDirtyChange?.( false ), [ onDirtyChange ] );

	const load = useCallback( () => {
		setLoading( true );
		const from = toUtcInstant( Date.now() - 30 * 86400000 );
		const to = toUtcInstant( Date.now() + 365 * 86400000 );
		api.get( '/blocked-periods', { staff_id: staffId, from, to, per_page: 100 } )
			.then( ( res ) => { setItems( res.items || [] ); setLoading( false ); } )
			.catch( () => setLoading( false ) );
	}, [ staffId ] );
	useEffect( load, [ load ] );

	// One POST per press, and a busy button while it is on the wire (persona QA 2026-10-05, T-067):
	// this form had no guard at all, so "Add time off" pressed twice stored two identical blocks.
	const once = useInFlight();
	const [ busy, setBusy ] = useState( false );
	const [ fieldError, setFieldError ] = useState( {} );

	const setField = ( key ) => ( e ) => {
		const value = e.target.value;
		setForm( ( f ) => ( { ...f, [ key ]: value } ) );
		// The message belongs to the value that earned it; a corrected field stops accusing.
		setFieldError( ( errors ) => ( errors.start || errors.end ? {} : errors ) );
	};

	const add = () => once( async () => {
		// Said ON the field (T-069): the toast this replaced vanished after a few seconds and
		// named no control, so an inverted range read as a button that did nothing.
		const errors = timeOffErrors( form );
		if ( Object.keys( errors ).length ) {
			setFieldError( errors );
			return;
		}
		setFieldError( {} );
		setBusy( true );
		try {
			await api.post( '/blocked-periods', {
				staff_id: staffId,
				start_datetime_utc: businessLocalDateToUtcIso( new Date( form.start ) ),
				end_datetime_utc: businessLocalDateToUtcIso( new Date( form.end ) ),
				reason: form.reason,
			} );
			showToast( 'Time off added.', 'success' );
			setAdding( false );
			setForm( { start: '', end: '', reason: '' } );
			load();
		} catch ( err ) {
			const fields = err.data?.fields;
			if ( fields?.start_datetime_utc || fields?.end_datetime_utc ) {
				setFieldError( { start: fields.start_datetime_utc, end: fields.end_datetime_utc } );
			}
			showToast( err.message, 'danger' );
		} finally {
			setBusy( false );
		}
	} );

	const remove = ( id ) => once( async () => {
		try {
			await api.del( `/blocked-periods/${ id }` );
			showToast( 'Time off removed.' );
			load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	} );

	return (
		<EditorCard
			id="staff-timeoff"
			title="Time off"
			description="Blocked periods and special hours appear on the Calendar and block new bookings."
			action={ ! adding ? <button type="button" className="pd-section-action" onClick={ () => setAdding( true ) }>{ renderIcon( 'plus' ) }Add time off</button> : null }
		>
			{ adding ? (
				<div className="ap-timeoff-form">
					<div className="pd-field-grid">
						<label className={ fieldClass( 'pd-compact-field is-filled', fieldError, 'start' ) }><input type="datetime-local" value={ form.start } onChange={ setField( 'start' ) } { ...fieldAria( 'timeoff', fieldError, 'start' ) } /><span className="pd-compact-label">From (business time)</span></label>
						<label className={ fieldClass( 'pd-compact-field is-filled', fieldError, 'end' ) }><input type="datetime-local" value={ form.end } onChange={ setField( 'end' ) } { ...fieldAria( 'timeoff', fieldError, 'end' ) } /><span className="pd-compact-label">To (business time)</span></label>
					</div>
					<FieldErrors prefix="timeoff" fieldError={ fieldError } keys={ [ 'start', 'end' ] } />
					<label className="pd-compact-field"><input value={ form.reason } placeholder=" " onChange={ ( e ) => setForm( ( f ) => ( { ...f, reason: e.target.value } ) ) } /><span className="pd-compact-label">Reason (optional)</span></label>
					<div className="ap-inline-actions"><button type="button" className="pd-button sm" disabled={ busy } onClick={ () => { setAdding( false ); setFieldError( {} ); } }>Cancel</button><button type="button" className="pd-button primary sm" disabled={ busy } onClick={ add }>{ busy ? __( 'Adding…', 'aponto' ) : 'Add time off' }</button></div>
				</div>
			) : null }
			{ loading ? <p className="pd-editor-note">Loading…</p> : items.length ? (
				<ul className="ap-timeoff-list">
					{ items.map( ( item ) => (
						<li key={ item.id }>
							<div><strong>{ timeOffRangeLabel( item ) }</strong>{ item.reason ? <span>{ item.reason }</span> : null }</div>
							<button type="button" className="pd-icon-button sm" aria-label="Remove time off" onClick={ () => remove( item.id ) }>{ renderIcon( 'close' ) }</button>
						</li>
					) ) }
				</ul>
			) : <p className="pd-editor-note">No time off scheduled.</p> }
		</EditorCard>
	);
}

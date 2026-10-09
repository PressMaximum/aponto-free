/**
 * Service editor (SPEC-P1 §1.1) — full-page CARD sections (four since persona QA 2026-10-05,
 * T-074: the empty "Public content" seam card is not rendered until the module ships).
 *
 * D-R55 (extended 2026-09-21): the sections are cards with the Settings panel anatomy, rendered
 * by the shared `lib/EditorCard.jsx`, exactly as the Staff editor's are. Adopting it is the two
 * steps that component's docblock promised — `ap-editor-cards` on the form, `EditorCard` around
 * each section — and it closes the "known and deliberate one-release gap" D-R55 recorded, where
 * the two full-page record editors looked different from each other.
 *
 * Nothing about the editor's behaviour moves with it: same five sections in the same order, same
 * fields in the same order, same anchors (`#service-<id>`) for the sticky nav and the scroll spy,
 * same validation and the same create-then-edit flow. Each card gains ONE honest description line
 * saying what an operator uses it for, and the Public-content seam's "Free — coming soon" badge
 * moves from the old flat header into the card header's trailing `action` slot.
 *
 * The five sections:
 *   1. Details            — name*, category (+ quick-create), description, status
 *                           enum (active|draft|archived, Q3), featured image (Q7).
 *   2. Public content     — honest seam for `service_catalog` (free but unbuilt since
 *                           D-R22; registry phase P5). Card state copy mirrors the
 *                           Modules screen's free+planned state: no phase string, no
 *                           upgrade link, no placeholder controls. This is now the ONLY
 *                           seam left on this page.
 *   3. Duration & price   — duration*, price (minor units), buffers, slot step, color (Q7).
 *   4. Staff & locations   — the eligible-staff editor (SPEC-P1 §1.1.4): a searchable
 *                           multi-select over `GET|PUT /services/{id}/eligibility`
 *                           (rest-contract §2.18). Editable when `multi_staff` is
 *                           available (D-R28); read-only otherwise, since Free
 *                           auto-links its single staff member and there is nothing
 *                           to choose between. With ≥1 active location each assigned
 *                           member also picks WHERE — "Every location" or specific
 *                           branches, one pair per branch (D-R63).
 *   5. Booking policy     — min lead / max horizon (nullable overrides, SPEC-P0 §4.2).
 *
 * Create = POST /services; Edit = PATCH /services/{id}. Capacity is hidden (Q6).
 *
 * WHY the create flow does not simply close (D-R28): the Free staff policy auto-assigns
 * by design (r1 review item 1), so on premium a brand-new service has ZERO rows in
 * `aponto_staff_services` — any-staff availability returns [] and the service is unbookable until
 * someone is assigned. Creating therefore hands the owner straight to this section instead of
 * dropping them back on the list with a service that silently cannot be booked.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { __, _n, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { moduleAvailable } from '../modules/catalog.js';
import { minorToMajor, majorToMinor, maxPriceMajor, money, MAX_PRICE_MINOR, MAX_LEAD_MINUTES, MAX_HORIZON_DAYS } from '../lib/format.js';
import { staffOptions, filterOptions } from '../lib/combobox-options.js';
import { fetchLocations } from '../lib/branches.js';
import { memberLocationIds, setMemberLocations } from '../lib/assignment-pairs.js';
import { MultiSelectPopover } from '../lib/MultiSelectPopover.jsx';
import { renderIcon } from '../lib/icon.jsx';
import { useToast } from '../lib/toast.jsx';
import { EditorCard } from '../lib/EditorCard.jsx';
import { useFocusFirstError } from '../lib/focus-first-error.js';
import { fieldClass, fieldAria, FieldErrors } from '../lib/field-error.jsx';
import { useSectionNav } from '../lib/section-nav.js';
import { useServiceDeposit } from '@aponto/admin-service-deposit';
import { useInFlight } from '../lib/in-flight.js';
import { countUpcomingBookings, upcomingBookingsNote } from '../lib/upcoming-bookings.js';
import { usePageTitle } from '../lib/page-title.js';

const STATUS_OPTIONS = [ { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' } ];
// R3 — full-page record-editor section nav (mockup .pd-record-editor-page).
//
// These labels are also the CARD TITLES since D-R55 (the same list drives both, so a nav button
// can never name something the page does not show). One consequence, recorded rather than
// silently applied: the Public-content section used to head itself "Public content & media"
// while its nav button said "Public content"; the card title is now the nav's shorter label.
const SECTIONS = [
	[ 'details', 'Details' ],
	[ 'pricing', 'Duration & price' ],
	[ 'assignments', 'Staff & locations' ],
	[ 'policy', 'Booking policy' ],
];

/**
 * The discard question, in ONE place.
 *
 * THREE guards ask it now (D-R58; handoff 2026-09-21 §4): this editor's own Cancel,
 * `routes/Services.jsx`'s cross-route `nav-guard` handler, and the same-route hold in
 * `lib/editor-guards.js`. Asking it in three sets of words would read as three different features,
 * which is why `LocationEditor.jsx` exports its own the same way. Module-level, so its identity is
 * stable enough to key the registering effect.
 *
 * @return {Object} `useConfirmDialog` options.
 */
export function discardPrompt() {
	return {
		title: __( 'Discard your changes?', 'aponto' ),
		message: __( 'This service has edits that have not been saved. Leaving now discards them.', 'aponto' ),
		confirmText: __( 'Discard changes', 'aponto' ),
		cancelText: __( 'Keep editing', 'aponto' ),
		destructive: true,
	};
}

/**
 * The one-line description under each card title (D-R55 anatomy).
 *
 * A function rather than a module-level map because every line goes through `__()`, and a
 * translated const evaluated at import time would be built before the handle's script
 * translations are in place. Each line answers "what do I use this card for?" in the operator's
 * words, not the schema's.
 *
 * @param {string} id Section id, as listed in SECTIONS.
 * @return {string} The card's one-line description.
 */
function sectionDescription( id ) {
	switch ( id ) {
		case 'details':
			return __( 'What customers are booking — its name, where it sits in your catalog, and whether it is live.', 'aponto' );
		case 'pricing':
			return __( 'How long an appointment runs, what it costs, and the gap you keep around it.', 'aponto' );
		case 'assignments':
			return __( 'Who can be booked for this service — with nobody assigned, nobody can book it.', 'aponto' );
		case 'policy':
			return __( 'Per-service overrides for how soon and how far ahead this one can be booked.', 'aponto' );
		default:
			return '';
	}
}

function blank() {
	return {
		name: '', category_id: '', description: '', status: 'active', image_id: null,
		duration_minutes: 30, price: '', buffer_before: 0, buffer_after: 0,
		slot_step_minutes: '', color: '', min_lead_minutes: '', max_horizon_days: '',
	};
}

function fromDto( dto ) {
	return {
		name: dto.name || '',
		category_id: dto.category_id ? String( dto.category_id ) : '',
		description: dto.description || '',
		status: dto.status || 'active',
		image_id: dto.image_id ?? null,
		duration_minutes: dto.duration_minutes ?? 30,
		price: dto.price_minor === null || dto.price_minor === undefined ? '' : String( minorToMajor( dto.price_minor ) ),
		buffer_before: dto.buffer_before ?? 0,
		buffer_after: dto.buffer_after ?? 0,
		slot_step_minutes: dto.slot_step_minutes ?? '',
		color: dto.color || '',
		min_lead_minutes: leadHours( dto.min_lead_minutes ),
		max_horizon_days: dto.max_horizon_days ?? '',
	};
}

/**
 * A stored per-service lead time (minutes) as the HOURS the field shows (persona QA 2026-10-05,
 * T-074). The global setting is entered in hours while this override asked for minutes, so "2"
 * meant two hours on one screen and two minutes on the other. The column, the REST field and the
 * form key stay `min_lead_minutes`; only what the operator types changed unit.
 *
 * @param {?number} minutes Stored minutes, or null/undefined for "use the default".
 * @return {string|number} Hours for the input, or '' when unset.
 */
export function leadHours( minutes ) {
	if ( minutes === null || minutes === undefined || minutes === '' ) {
		return '';
	}
	return Math.round( ( Number( minutes ) / 60 ) * 100 ) / 100;
}

/**
 * The hours typed into the lead-time field as whole stored minutes, or null for blank.
 *
 * @param {string|number} hours Field value.
 * @return {?number} Minutes (may be NaN/negative for the validator to refuse), or null.
 */
export function leadMinutes( hours ) {
	if ( String( hours ).trim() === '' ) {
		return null;
	}
	return Math.round( Number( hours ) * 60 );
}

function numOrNull( value ) {
	return String( value ).trim() === '' ? null : Number( value );
}

/**
 * @param {Object}    props                 Editor props.
 * @param {string}    props.mode            `create` or `edit`.
 * @param {Object}    [props.service]       The row the list handed over.
 * @param {Array}     props.categories      Category options.
 * @param {Function}  props.onCreateCategory Inline category create.
 * @param {Function}  props.onClose         Leave the editor.
 * @param {Function}  props.onSaved         Reload the list.
 * @param {Function}  [props.onDirtyChange] Report unsaved edits up to the route, which owns both
 *                                          nav guards (`lib/editor-guards.js`).
 * @param {Function}  [props.confirm]       `confirm( opts )` from the ROUTE's `useConfirmDialog`,
 *                                          passed in rather than created here on purpose: this
 *                                          module also exports the pure eligibility helpers, which
 *                                          `tests/js/multi-staff.test.js` imports under plain node,
 *                                          and `lib/confirm.jsx` pulls in `@wordpress/components`.
 *                                          The route renders the one dialog both guards and this
 *                                          editor's Cancel share.
 */
export function ServiceEditor( { mode, service, categories, onCreateCategory, onClose, onSaved, onDirtyChange, confirm } ) {
	const showToast = useToast();
	const multiStaff = moduleAvailable( config, 'multi_staff' );
	// A service created in THIS editor session (premium create-then-edit, see the file header).
	// Once set, the editor is editing that record: `creating` flips false, so Save becomes a
	// PATCH and the eligibility section — which needs a service id — comes alive.
	const [ createdId, setCreatedId ] = useState( null );
	const creating = mode === 'create' && null === createdId;
	// The tab title names the record being edited — its SAVED name, not the one being typed.
	usePageTitle( 'create' === mode ? __( 'New service', 'aponto' ) : service?.name );
	const serviceId = service?.id ?? createdId;
	const [ loading, setLoading ] = useState( ! creating );
	const [ saving, setSaving ] = useState( false );
	// Pending eligibility edits, published by EligibilitySection as `{ dirty, save }` so the
	// page-level Save can flush them — the same one-continuous-form rule StaffWorkspace follows
	// for work hours (a section that silently drops a pending edit on unmount is a data-loss bug).
	const eligibilityRef = useRef( null );
	const [ form, setForm ] = useState( creating ? blank : () => ( service ? fromDto( service ) : blank() ) );
	const deposit = useServiceDeposit( { serviceId, price: form.price, saving } );
	const sections = deposit.nav ? [ ...SECTIONS.slice( 0, 3 ), deposit.nav, ...SECTIONS.slice( 3 ) ] : SECTIONS;
	// Signature of the fields the SERVER currently holds — anything else is a pending edit. Moved
	// forward by the fresh GET below and by every successful write, so a save can never leave the
	// editor permanently "dirty" (which would have the guard ask about edits that are saved).
	const [ baseline, setBaseline ] = useState( () =>
		JSON.stringify( creating ? blank() : ( service ? fromDto( service ) : blank() ) )
	);
	// Pending eligibility edits, as state rather than only through `eligibilityRef` — a ref cannot
	// re-render the guard that has to act on it. Same fact, same computation, one source.
	const [ eligibilityDirty, setEligibilityDirty ] = useState( false );
	const [ fieldError, setFieldError ] = useState( {} );
	const [ imageUrl, setImageUrl ] = useState( '' );
	const [ addingCategory, setAddingCategory ] = useState( false );
	const [ newCategory, setNewCategory ] = useState( '' );
	const formRef = useRef( null );
	// A refusal counter plus what to say about it. Bumped by every save that rejects, and read
	// by the effect below — which runs after the DOM is committed, so it needs no scheduler.
	// It replaces a `requestAnimationFrame`, which an embedded or backgrounded browser pane
	// throttles to never: the errors painted and the focus simply never moved (round-3 QA).
	const [ errorToken, setErrorToken ] = useState( 0 );
	const errorPlan = useRef( {} );
	useFocusFirstError( errorToken, formRef, errorPlan );

	// Sticky section nav + scroll spy, shared with the Staff editor (`lib/section-nav.js`).
	// The IntersectionObserver band this replaces could not select a card shorter than itself,
	// which on this page meant "Public content" never lit and "Booking policy" was unreachable
	// (founder QA 2026-09-21).
	const { active, scrollTo } = useSectionNav( {
		anchors: sections,
		bodyRef: formRef,
		prefix: 'service-',
		ready: ! loading,
	} );

	// Edit: load a fresh copy so the editor never drifts from the list window.
	useEffect( () => {
		if ( creating || ! service?.id ) {
			return;
		}
		let live = true;
		api.get( `/services/${ service.id }` )
			.then( ( dto ) => { if ( live ) { setForm( fromDto( dto ) ); setBaseline( JSON.stringify( fromDto( dto ) ) ); setLoading( false ); } } )
			.catch( () => { if ( live ) { setLoading( false ); } } );
		return () => { live = false; };
	}, [ creating, service ] );

	/**
	 * Whether this editor holds unsaved edits — the fields, a pending staff assignment, or a
	 * new-category name typed into the inline create.
	 *
	 * Reported UP rather than guarded here: `routes/Services.jsx` owns both guards, because it is
	 * the component that decides which surface is on screen (the editor opens from LOCAL STATE
	 * without touching the hash) and it is the one that survives a same-route move. The unmount
	 * report is what makes closing the editor, or discarding onto another record, clear the guard.
	 *
	 * Never while LOADING: the fresh GET has not landed yet, so the form on screen is the list's
	 * row and every difference from it is the server's, not the operator's.
	 */
	const dirty = ! loading && (
		JSON.stringify( form ) !== baseline || eligibilityDirty || deposit.dirty || Boolean( newCategory.trim() )
	);
	useEffect( () => {
		onDirtyChange?.( dirty );
	}, [ dirty, onDirtyChange ] );
	useEffect( () => () => onDirtyChange?.( false ), [ onDirtyChange ] );

	// Cancel asks the same question the nav guards ask. It used to close outright: one click, and a
	// half-filled service was gone with no request, no toast and no way back (handoff §4).
	const leave = async () => {
		if ( dirty && confirm && ! ( await confirm( discardPrompt() ) ) ) {
			return;
		}
		onClose?.();
	};

	// Resolve the featured-image thumbnail for display (wp.media attachment).
	useEffect( () => {
		if ( ! form.image_id || ! window.wp?.media ) {
			setImageUrl( '' );
			return;
		}
		const attachment = window.wp.media.attachment( form.image_id );
		attachment.fetch().then( () => setImageUrl( attachment.get( 'sizes' )?.thumbnail?.url || attachment.get( 'url' ) || '' ) );
	}, [ form.image_id ] );

	const set = ( key ) => ( e ) => setForm( ( f ) => ( { ...f, [ key ]: e.target.value } ) );

	const pickImage = () => {
		if ( ! window.wp?.media ) {
			showToast( 'The media library is unavailable on this screen.', 'danger' );
			return;
		}
		const frame = window.wp.media( { title: 'Select featured image', button: { text: 'Use image' }, multiple: false, library: { type: 'image' } } );
		frame.on( 'select', () => {
			const attachment = frame.state().get( 'selection' ).first().toJSON();
			setForm( ( f ) => ( { ...f, image_id: attachment.id } ) );
			setImageUrl( attachment.sizes?.thumbnail?.url || attachment.url || '' );
		} );
		frame.open();
	};

	// One request per press (persona QA 2026-10-05, T-066). `saving` reaches the button only on
	// the next render — and was set AFTER validation — so two taps in one frame both posted and
	// "Create service" made two identical services. The ref closes that window synchronously.
	const once = useInFlight();

	const confirmNewCategory = () => once( async () => {
		const name = newCategory.trim();
		if ( ! name ) {
			return;
		}
		try {
			const created = await onCreateCategory( name );
			setForm( ( f ) => ( { ...f, category_id: String( created.id ) } ) );
			setAddingCategory( false );
			setNewCategory( '' );
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	} );

	const saveNow = async () => {
		const errors = {};
		if ( ! form.name.trim() ) {
			errors.name = 'A service name is required.';
		}
		const duration = Number( form.duration_minutes );
		if ( ! duration || duration < 5 || duration > 480 || duration % 5 !== 0 ) {
			errors.duration_minutes = 'Duration must be 5–480 minutes in steps of 5.';
		}
		// Price ceiling mirrors the server bound (`Args::MAX_PRICE_MINOR`, the `price_minor int
		// unsigned` column). Fail here with the number in the admin's own currency; the server
		// still rejects out-of-range prices on its own and its field error lands on this field.
		const priceMinor = majorToMinor( form.price );
		if ( priceMinor !== null && ( priceMinor < 0 || priceMinor > MAX_PRICE_MINOR ) ) {
			errors.price_minor = sprintf(
				/* translators: 1: lowest allowed price, 2: highest allowed price, both formatted money. */
				__( 'Price must be between %1$s and %2$s.', 'aponto' ),
				money( 0 ),
				money( MAX_PRICE_MINOR )
			);
		}
		// The booking-policy overrides mirror their own columns the same way (`min_lead_minutes`
		// int unsigned, `max_horizon_days` smallint unsigned) — told here rather than after a
		// round-trip, and the server's field error lands on the same field when it gets there.
		const lead = leadMinutes( form.min_lead_minutes );
		if ( lead !== null && ( ! Number.isInteger( lead ) || lead < 0 || lead > MAX_LEAD_MINUTES ) ) {
			errors.min_lead_minutes = sprintf(
				/* translators: %d: the highest allowed lead time in hours. */
				__( 'Lead time must be between 0 and %d hours.', 'aponto' ),
				Math.floor( MAX_LEAD_MINUTES / 60 )
			);
		}
		const horizon = numOrNull( form.max_horizon_days );
		if ( horizon !== null && ( ! Number.isInteger( horizon ) || horizon < 1 || horizon > MAX_HORIZON_DAYS ) ) {
			errors.max_horizon_days = sprintf(
				/* translators: %d: the highest allowed booking horizon in days. */
				__( 'Horizon must be a whole number of days between 1 and %d.', 'aponto' ),
				MAX_HORIZON_DAYS
			);
		}
		if ( Object.keys( errors ).length ) {
			setFieldError( errors );
			// A refusal the operator can act on (founder QA 2026-09-21). The error paint alone
			// is invisible when the offending field is a card or two off-screen, which the
			// carded layout made routine — so go there, put the caret in it, and say so.
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
			name: form.name.trim(),
			category_id: form.category_id ? Number( form.category_id ) : null,
			description: form.description,
			status: form.status,
			image_id: form.image_id ?? null,
			duration_minutes: duration,
			price_minor: priceMinor,
			buffer_before: Number( form.buffer_before ) || 0,
			buffer_after: Number( form.buffer_after ) || 0,
			slot_step_minutes: numOrNull( form.slot_step_minutes ),
			color: form.color ? form.color : null,
			min_lead_minutes: lead,
			max_horizon_days: numOrNull( form.max_horizon_days ),
		};
		try {
			deposit.validate();
			if ( creating ) {
				const created = await api.post( '/services', body );
				// Remember the created record before the separate policy write, so a retry never creates a duplicate.
				if ( deposit.nav ) {
					setCreatedId( created.id );
				}
				try {
					await deposit.save( created.id );
				} catch ( depositError ) {
					setBaseline( JSON.stringify( form ) );
					await onSaved?.();
					throw new Error( sprintf( __( 'Service created, but the deposit was not saved: %s', 'aponto' ), depositError.message ) );
				}
				// The fields on screen are now the fields the server holds, so the editor stops
				// counting as dirty and the nav guard unregisters itself. It matters on the premium
				// create path below, which deliberately does NOT close.
				setBaseline( JSON.stringify( form ) );
				// AWAIT the parent reload before closing so the list/quick-view behind the editor
				// is already fresh when it reappears — no stale-price window (r1 item 9; U1 BUG-5).
				await onSaved?.();
				if ( multiStaff && created?.id ) {
					// Premium: the service exists but has NO eligible staff yet, so closing here
					// would hand back a service that cannot be booked and say nothing. Stay open on
					// the new record and point at the section that fixes it.
					setCreatedId( created.id );
					setSaving( false );
					showToast( `${ body.name } created — now choose who can be booked for it.`, 'success' );
					scrollTo( 'assignments' );
					return;
				}
				showToast( `${ body.name } created.`, 'success' );
				onClose?.();
				return;
			}

			await api.patch( `/services/${ serviceId }`, body );
			setBaseline( JSON.stringify( form ) );
			try {
				await deposit.save( serviceId );
			} catch ( depositError ) {
				await onSaved?.();
				throw new Error( sprintf( __( 'Service saved, but the deposit was not saved: %s', 'aponto' ), depositError.message ) );
			}
			// This page is ONE continuous form: a pending eligibility edit must be written by the
			// page Save too, or it dies on unmount with no request and no error.
			const eligibility = eligibilityRef.current;
			if ( eligibility?.dirty ) {
				try {
					await eligibility.save();
				} catch ( eligibilityError ) {
					// Half-save: the service fields landed, the assignments did not. Say so and keep
					// the editor open so the staff selection can be retried.
					showToast(
						sprintf(
							/* translators: %s: the reason the staff assignments could not be saved. */
							__( 'Service saved, but the staff assignments were not: %s', 'aponto' ),
							eligibilityError.message
						),
						'danger'
					);
					await onSaved?.();
					setSaving( false );
					return;
				}
			}
			showToast( 'Service saved.', 'success' );
			await onSaved?.();
			onClose?.();
		} catch ( err ) {
			const fields = err.data?.fields;
			if ( fields ) {
				setFieldError( fields );
				// Same treatment as the client-side refusal: a server 422 names fields, and the
				// operator must be taken to the first one rather than left staring at Save.
				// No announcement from here — the server's own message is toasted below, and it
				// is more specific than ours; two toasts for one event would be wrong.
				errorPlan.current = { announce: null };
				setErrorToken( ( token ) => token + 1 );
			}
			showToast( err.message, 'danger' );
			setSaving( false );
		}
	};
	const save = () => once( saveNow );

	const editorHead = ( strong ) => (
		<header className="pd-record-editor-head">
			<h1>
				<button type="button" onClick={ leave }>Services</button>
				<span aria-hidden="true">{ renderIcon( 'chevron' ) }</span>
				<strong>{ strong }</strong>
			</h1>
			<div className="pd-record-editor-actions">
				<button className="pd-button" type="button" onClick={ leave }>Cancel</button>
				<button className="pd-button primary" type="button" disabled={ saving || loading || ! deposit.ready } onClick={ save }>{ saving ? 'Saving…' : creating ? 'Create service' : 'Save changes' }</button>
			</div>
		</header>
	);

	if ( loading ) {
		return (
			<div className="pd-page pd-record-editor-page pd-service-editor-page">
				{ editorHead( 'Loading…' ) }
				<p className="pd-editor-note">Loading service…</p>
			</div>
		);
	}

	return (
		<div className="pd-page pd-record-editor-page pd-service-editor-page">
			{ editorHead( creating ? 'New service' : form.name || 'Edit service' ) }
			<div className="pd-record-editor-layout">
				<aside className="pd-editor-nav" aria-label="Service editor sections">
					{ sections.map( ( [ id, label ] ) => (
						<button key={ id } type="button" className={ active === id ? 'is-active' : undefined } aria-current={ active === id ? 'true' : undefined } onClick={ () => scrollTo( id ) }>{ label }</button>
					) ) }
				</aside>
				{ /* `ap-editor-cards` is the D-R55 modifier the Staff editor introduced: it turns the
				     flat, rule-divided sections of `.pd-record-editor-form` into a stack of cards with
				     the Settings page’s own gap. The shell stays a real `<form>` — it carries
				     `autoComplete="off"` and swallows the implicit submit — because neither the class
				     nor `EditorCard` cares which element the sections are stacked in. */ }
				<form className="pd-record-editor-form ap-editor-cards" ref={ formRef } autoComplete="off" onSubmit={ ( e ) => e.preventDefault() }>
					{ /* 1. Details */ }
					<EditorCard id="service-details" title="Details" description={ sectionDescription( 'details' ) }>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'name' ) }>
							<input name="name" value={ form.name } placeholder=" " required onChange={ set( 'name' ) } { ...fieldAria( 'service', fieldError, 'name' ) } />
							<span className="pd-compact-label">Service name</span>
						</label>
						<FieldErrors prefix="service" fieldError={ fieldError } keys={ [ 'name' ] } />
						{ addingCategory ? (
							<div className="ap-inline-create">
								<label className="pd-compact-field"><input value={ newCategory } placeholder=" " autoFocus onChange={ ( e ) => setNewCategory( e.target.value ) } onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) { e.preventDefault(); confirmNewCategory(); } } } /><span className="pd-compact-label">New category name</span></label>
								<button className="pd-button primary sm" type="button" onClick={ confirmNewCategory }>Add</button>
								<button className="pd-button sm" type="button" onClick={ () => { setAddingCategory( false ); setNewCategory( '' ); } }>Cancel</button>
							</div>
						) : (
							<label className={ fieldClass( 'pd-compact-field pd-compact-select is-filled', fieldError, 'category_id' ) }>
								<select value={ form.category_id } onChange={ ( e ) => { if ( e.target.value === '__new' ) { setAddingCategory( true ); } else { setForm( ( f ) => ( { ...f, category_id: e.target.value } ) ); } } } { ...fieldAria( 'service', fieldError, 'category_id' ) }>
									<option value="">Uncategorized</option>
									{ categories.map( ( c ) => <option key={ c.id } value={ c.id }>{ c.name }</option> ) }
									<option value="__new">+ New category…</option>
								</select>
								<span className="pd-compact-label">Category</span>
								<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
							</label>
						) }
						<FieldErrors prefix="service" fieldError={ fieldError } keys={ [ 'category_id' ] } />
						<label className="pd-compact-field pd-compact-notes"><textarea name="description" rows="3" placeholder=" " value={ form.description } onChange={ set( 'description' ) } /><span className="pd-compact-label">Description</span></label>
						<div className="pd-form-grid">
							<label className={ fieldClass( 'pd-compact-field pd-compact-select is-filled', fieldError, 'status' ) }>
								<select value={ form.status } onChange={ set( 'status' ) } { ...fieldAria( 'service', fieldError, 'status' ) }>
									{ STATUS_OPTIONS.map( ( s ) => <option key={ s.value } value={ s.value }>{ s.label }</option> ) }
								</select>
								<span className="pd-compact-label">Status</span>
								<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
							</label>
							<div className={ fieldClass( 'ap-image-field', fieldError, 'image_id' ) }>
								{ imageUrl ? <img src={ imageUrl } alt="" className="ap-image-thumb" /> : <span className="ap-image-placeholder" aria-hidden="true">{ renderIcon( 'image' ) }</span> }
								<div className="ap-image-actions">
									<button className="pd-button sm" type="button" onClick={ pickImage } { ...fieldAria( 'service', fieldError, 'image_id' ) }>{ form.image_id ? 'Change image' : 'Set featured image' }</button>
									{ form.image_id ? <button className="pd-button text sm" type="button" onClick={ () => { setForm( ( f ) => ( { ...f, image_id: null } ) ); setImageUrl( '' ); } }>Remove</button> : null }
								</div>
							</div>
						{ /* Server-only keys of the Details card: neither has a client-side rule, so a 422 is the ONLY way they ever speak. */ }
						<FieldErrors prefix="service" fieldError={ fieldError } keys={ [ 'status', 'image_id' ] } className="ap-field-error-row" />
						</div>
					</EditorCard>

					{ /* (2. Public content was an empty card holding one paragraph about a module that is
					     "free, and not built yet" — a developer note on a page operators fill in. It is
					     gone until the Service catalog module ships and has controls to put here;
					     persona QA 2026-10-05, T-074. The numbering below keeps the original order.) */ }
					{ /* 3. Duration & price */ }
					<EditorCard
						id="service-pricing"
						title="Duration & price"
						description={ sectionDescription( 'pricing' ) }
						bodyClassName="pd-form-grid"
					>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'duration_minutes' ) }><input type="number" min="5" max="480" step="5" value={ form.duration_minutes } placeholder=" " onChange={ set( 'duration_minutes' ) } { ...fieldAria( 'service', fieldError, 'duration_minutes' ) } /><span className="pd-compact-label">Duration (minutes)</span></label>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'price_minor' ) }><input type="number" min="0" max={ maxPriceMajor() } step="any" value={ form.price } placeholder=" " onChange={ set( 'price' ) } { ...fieldAria( 'service', fieldError, 'price_minor' ) } /><span className="pd-compact-label">Price ({ config.currency })</span></label>
						<FieldErrors prefix="service" fieldError={ fieldError } keys={ [ 'duration_minutes', 'price_minor' ] } className="ap-field-error-row" />
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'buffer_before' ) }><input type="number" min="0" max="120" value={ form.buffer_before } placeholder=" " onChange={ set( 'buffer_before' ) } { ...fieldAria( 'service', fieldError, 'buffer_before' ) } /><span className="pd-compact-label">Buffer before (min)</span></label>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'buffer_after' ) }><input type="number" min="0" max="120" value={ form.buffer_after } placeholder=" " onChange={ set( 'buffer_after' ) } { ...fieldAria( 'service', fieldError, 'buffer_after' ) } /><span className="pd-compact-label">Buffer after (min)</span></label>
						<FieldErrors prefix="service" fieldError={ fieldError } keys={ [ 'buffer_before', 'buffer_after' ] } className="ap-field-error-row" />
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'slot_step_minutes' ) }><input type="number" min="5" max="480" step="5" value={ form.slot_step_minutes } placeholder=" " onChange={ set( 'slot_step_minutes' ) } { ...fieldAria( 'service', fieldError, 'slot_step_minutes' ) } /><span className="pd-compact-label">{ __( 'Slot step in minutes (leave blank to use the default)', 'aponto' ) }</span></label>
						<label className={ fieldClass( 'ap-color-field', fieldError, 'color' ) }>
							<span className="ap-color-label">Colour</span>
							<span className="ap-color-input"><input type="color" value={ form.color || '#3858e9' } onChange={ set( 'color' ) } { ...fieldAria( 'service', fieldError, 'color' ) } />{ form.color ? <button type="button" className="pd-button text sm" onClick={ () => setForm( ( f ) => ( { ...f, color: '' } ) ) }>Clear</button> : <span className="pd-editor-note">Default</span> }</span>
						</label>
						<FieldErrors prefix="service" fieldError={ fieldError } keys={ [ 'slot_step_minutes', 'color' ] } className="ap-field-error-row" />
					</EditorCard>

					{ deposit.section }

					{ /* 4. Staff & locations — eligible-staff editor (rest-contract §2.18) */ }
					<EligibilitySection
						serviceId={ serviceId }
						editable={ multiStaff }
						saveRef={ eligibilityRef }
						showToast={ showToast }
						onDirtyChange={ setEligibilityDirty }
					/>

					{ /* 5. Booking policy */ }
					<EditorCard
						id="service-policy"
						title="Booking policy"
						description={ sectionDescription( 'policy' ) }
						bodyClassName="pd-form-grid"
					>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'min_lead_minutes' ) }><input type="number" min="0" max={ Math.floor( MAX_LEAD_MINUTES / 60 ) } step="any" value={ form.min_lead_minutes } placeholder=" " onChange={ set( 'min_lead_minutes' ) } { ...fieldAria( 'service', fieldError, 'min_lead_minutes' ) } /><span className="pd-compact-label">{ __( 'Min lead time in hours (leave blank to use the default)', 'aponto' ) }</span></label>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'max_horizon_days' ) }><input type="number" min="1" max={ MAX_HORIZON_DAYS } step="1" value={ form.max_horizon_days } placeholder=" " onChange={ set( 'max_horizon_days' ) } { ...fieldAria( 'service', fieldError, 'max_horizon_days' ) } /><span className="pd-compact-label">{ __( 'Max horizon in days (leave blank to use the default)', 'aponto' ) }</span></label>
						<FieldErrors prefix="service" fieldError={ fieldError } keys={ [ 'min_lead_minutes', 'max_horizon_days' ] } className="ap-field-error-row" />
					</EditorCard>
					<footer className="pd-editor-footer">
						<button className="pd-button" type="button" onClick={ leave }>Cancel</button>
						<button className="pd-button primary" type="button" disabled={ saving || ! deposit.ready } onClick={ save }>{ saving ? 'Saving…' : creating ? 'Create service' : 'Save changes' }</button>
					</footer>
				</form>
			</div>
		</div>
	);
}

// --- Staff & locations (eligibility) ----------------------------------------
/**
 * Canonical assignment rows for `PUT /services/{id}/eligibility` (rest-contract §2.18, rev
 * 2026-07-19 per-pair): ascending `(staff_id, location_id)`. `JSON.stringify` of the result is
 * also the section's dirty-check signature, so "what we would send" and "what we compare" can
 * never drift — the same discipline `weeklyRows()` enforces for the schedule PUT.
 *
 * @param {Array} assignments Pairs `{staff_id, location_id}` in any order.
 * @return {Array} Sorted contract rows.
 */
export function eligibilityRows( assignments ) {
	return [ ...( assignments || [] ) ]
		.map( ( pair ) => ( { staff_id: Number( pair.staff_id ), location_id: Number( pair.location_id ) || 0 } ) )
		.sort( ( a, b ) => ( a.staff_id - b.staff_id ) || ( a.location_id - b.location_id ) );
}

/**
 * Toggle one staff member's eligibility for the service, preserving per-location detail.
 *
 * Selecting adds the WILDCARD pair `location_id: 0` — "bookable at every location", the value
 * invariant 11 defines as "no location" and the scope `ConnectionRepository::staffForService()`
 * always matches. Deselecting drops EVERY pair for that member, wildcard and per-location alike.
 *
 * Re-selecting a member who already has narrower rows leaves those rows untouched: the wire shape
 * is per-pair precisely so a non-cartesian mapping survives a round-trip, and a UI that cannot
 * express locations must not flatten one it did not create.
 *
 * @param {Array}  assignments Current pairs.
 * @param {number} staffId     Staff id to toggle.
 * @return {Array} Next pairs.
 */
export function toggleStaffAssignment( assignments, staffId ) {
	const id = Number( staffId );
	const current = assignments || [];
	if ( current.some( ( pair ) => Number( pair.staff_id ) === id ) ) {
		return current.filter( ( pair ) => Number( pair.staff_id ) !== id );
	}
	return [ ...current, { staff_id: id, location_id: 0 } ];
}

/**
 * Staff ids whose assignment is LOCATION-SCOPED — they have pairs for this service, but none of
 * them is the `location_id: 0` wildcard, so they are eligible only at specific locations.
 *
 * This UI can preserve such rows but cannot author or edit them (`toggleStaffAssignment` only ever
 * writes wildcards), so without surfacing them the checkbox would silently mean two different
 * things for two different rows. Codex review: the section used to claim outright that "everyone
 * selected is available at every location", which is false exactly for these members.
 *
 * @param {Array} assignments Current pairs.
 * @return {Set<number>} Staff ids with no wildcard row.
 */
export function locationScopedStaffIds( assignments ) {
	const byStaff = new Map();
	( assignments || [] ).forEach( ( pair ) => {
		const id = Number( pair?.staff_id );
		const wildcard = 0 === ( Number( pair?.location_id ) || 0 );
		byStaff.set( id, ( byStaff.get( id ) ?? false ) || wildcard );
	} );

	const scoped = new Set();
	byStaff.forEach( ( hasWildcard, id ) => {
		if ( ! hasWildcard ) {
			scoped.add( id );
		}
	} );

	return scoped;
}

/**
 * The compact summary a member's branch picker shows on its trigger (D-R64): "Every location" for
 * the wildcard, the branch names for one or two ("Downtown", "Downtown, Uptown"), a count beyond
 * that ("3 locations") — the trigger is ~220px wide and sits at the end of the member's row. Names
 * come from the picker's own items, so an archived branch keeps its "(archived)" suffix here too.
 *
 * @param {number[]} ids        The member's branches ({@see memberLocationIds}); `[]` = every one.
 * @param {Array}    items      Picker items `[ { id, label } ]`.
 * @param {string}   everyLabel Translated "Every location".
 * @return {string} Trigger text.
 */
export function branchPickerSummary( ids, items, everyLabel ) {
	const picked = ids || [];
	if ( ! picked.length ) {
		return everyLabel;
	}
	if ( picked.length > 2 ) {
		return sprintf(
			/* translators: %d: number of locations a staff member is assigned at. */
			_n( '%d location', '%d locations', picked.length, 'aponto' ),
			picked.length
		);
	}
	return picked
		.map( ( id ) => ( items || [] ).find( ( item ) => Number( item.id ) === Number( id ) )?.label || `#${ id }` )
		.join( ', ' );
}

/**
 * The Staff & locations section.
 *
 * Editable only when `multi_staff` is available (D-R28). Without it the Free plan auto-links its
 * single staff member on create, so there is nothing to choose
 * between — the section shows that linked member read-only rather than a control whose every
 * second option the server would refuse with 403 `aponto_plan_limit`.
 *
 * @param {{serviceId: ?number, editable: boolean, saveRef: Object, showToast: Function,
 *          onDirtyChange: Function}} props Section props.
 */
function EligibilitySection( { serviceId, editable, saveRef, showToast, onDirtyChange } ) {
	const [ loading, setLoading ] = useState( Boolean( serviceId ) );
	const [ staff, setStaff ] = useState( [] );
	const [ assignments, setAssignments ] = useState( [] );
	// Signature of the assignment set the server currently holds — anything else is a pending
	// edit. `null` until a GET succeeds, so a failed load can never look "dirty" and have the page
	// Save replace a real assignment set with an empty one (the WorkHoursSection lesson).
	const [ baseline, setBaseline ] = useState( null );
	const [ query, setQuery ] = useState( '' );
	const [ saving, setSaving ] = useState( false );
	// D-R63: the location catalog, ALL statuses (fix round 1) — an existing pair at a branch archived
	// since must still read by its name and stay removable; only ACTIVE branches are offered as new
	// ones. Empty = the section is exactly its pre-D-R63 self (no picker, the "Specific locations"
	// marker kept for rows it cannot author).
	const [ locations, setLocations ] = useState( [] );
	// Fix round 3: a catalog that did not load COMPLETELY cannot be told from a smaller one, so the
	// branch pickers — which write location pairs — are disabled and say why.
	const [ catalogIncomplete, setCatalogIncomplete ] = useState( false );

	useEffect( () => {
		let live = true;
		fetchLocations().then( ( { items, complete } ) => {
			if ( ! live ) {
				return;
			}
			if ( items.length ) {
				setLocations( items );
			}
			if ( ! complete ) {
				setCatalogIncomplete( true );
			}
		} );
		return () => { live = false; };
	}, [] );

	useEffect( () => {
		if ( ! serviceId ) {
			setLoading( false );
			return undefined;
		}
		let live = true;
		setLoading( true );
		Promise.all( [
			api.get( '/staff', { status: 'active', per_page: 100 } ).catch( () => ( { items: [] } ) ),
			api.get( `/services/${ serviceId }/eligibility` ),
		] )
			.then( ( [ staffRes, eligibility ] ) => {
				if ( ! live ) {
					return;
				}
				const pairs = eligibility.assignments || [];
				setStaff( staffRes.items || [] );
				setAssignments( pairs );
				setBaseline( JSON.stringify( eligibilityRows( pairs ) ) );
				setLoading( false );
			} )
			.catch( () => { if ( live ) { setLoading( false ); } } );
		return () => { live = false; };
	}, [ serviceId ] );

	// The one write path. REJECTS on failure so every caller decides how to surface it — the page
	// Save has to be able to say the service saved but the assignments did not.
	const persist = useCallback( async ( next ) => {
		const rows = eligibilityRows( next );
		setSaving( true );
		try {
			const res = await api.put( `/services/${ serviceId }/eligibility`, { assignments: rows } );
			const saved = res.assignments || rows;
			setAssignments( saved );
			setBaseline( JSON.stringify( eligibilityRows( saved ) ) );
		} finally {
			setSaving( false );
		}
	}, [ serviceId ] );

	// ONE pending-edit signature, read by the page Save (through `saveRef`), by this section's own
	// button, and by the dirty guards (through `onDirtyChange`). `null` baseline means the GET never
	// succeeded, so a failed load can neither look dirty nor have the page Save replace a real
	// assignment set with an empty one.
	const dirty = null !== baseline && JSON.stringify( eligibilityRows( assignments ) ) !== baseline;

	// Publish the pending edit to ServiceEditor so the page Save can flush it. Re-registered every
	// render so the closure over `assignments` is never stale.
	useEffect( () => {
		if ( ! saveRef ) {
			return undefined;
		}
		const handle = { dirty, save: () => persist( assignments ) };
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

	const selected = new Set( assignments.map( ( pair ) => Number( pair.staff_id ) ) );
	const locationScoped = locationScopedStaffIds( assignments );
	const hasBranches = locations.length > 0;
	// The picker's catalog for one member: every ACTIVE branch (selectable as new), plus any branch
	// the member is ALREADY assigned at that is not active — named "(archived)", or `#id` if the
	// catalog lost it — so the pair can be unticked rather than silently kept.
	const branchItems = ( ids ) => [
		...locations.filter( ( location ) => 'active' === location.status ).map( ( location ) => ( { id: location.id, label: location.name } ) ),
		...ids.filter( ( id ) => ! locations.some( ( location ) => location.id === id && 'active' === location.status ) ).map( ( id ) => {
			const known = locations.find( ( location ) => location.id === id );
			return {
				id,
				label: known ? sprintf(
					/* translators: %s: location name. */
					__( '%s (archived)', 'aponto' ),
					known.name
				) : `#${ id }`,
			};
		} ),
	];
	const options = staffOptions( staff );
	const visible = filterOptions( options, query );
	// Job titles ride the row beside the name (D-R64); the roster carries them, the shared combobox
	// options do not.
	const titles = new Map( staff.map( ( member ) => [ Number( member.id ), String( member.title || '' ).trim() ] ) );

	const onceSection = useInFlight();
	const saveNow = () => onceSection( async () => {
		// Members this save REMOVES from the service. Their existing bookings are untouched, and
		// the toast says so (persona QA 2026-10-05, T-075) instead of leaving it to be assumed.
		const before = new Set( ( JSON.parse( baseline || '[]' ) || [] ).map( ( pair ) => Number( pair.staff_id ) ) );
		const after = new Set( eligibilityRows( assignments ).map( ( pair ) => pair.staff_id ) );
		const removed = [ ...before ].filter( ( id ) => ! after.has( id ) );
		try {
			await persist( assignments );
			let kept = 0;
			if ( removed.length ) {
				const counts = await Promise.all(
					removed.map( ( staffId ) => countUpcomingBookings( { service_id: serviceId, staff_id: staffId } ) )
				);
				kept = counts.reduce( ( sum, count ) => sum + ( count || 0 ), 0 );
			}
			const note = upcomingBookingsNote( kept );
			showToast( note ? `Staff assignments saved. ${ note }` : 'Staff assignments saved.', 'success' );
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	} );

	// The unbookable warning. Any-staff availability resolves through `aponto_staff_services`, so
	// a service with no eligible staff returns NO slots — it goes invisible on the booking form
	// rather than visibly broken, which is exactly why this has to be stated here. Shown in both
	// modes: an empty set is equally unbookable on Free.
	const empty = ! loading && null !== baseline && 0 === assignments.length;

	return (
		<EditorCard
			id="service-assignments"
			title="Staff & locations"
			description={ sectionDescription( 'assignments' ) }
		>
			{ ! serviceId ? (
				<p className="pd-editor-note">{ __( 'Create the service first — then choose who can be booked for it.', 'aponto' ) }</p>
			) : loading ? (
				<p className="pd-editor-note">{ __( 'Loading…', 'aponto' ) }</p>
			) : (
				<>
					{ empty ? (
						<p className="ap-field-error" role="status">
							{ __( 'No staff assigned — this service is not bookable until someone can take it.', 'aponto' ) }
						</p>
					) : null }
					{ editable ? (
						<>
							<p className="pd-editor-note">
								{ hasBranches
									? __( 'Tick who can be booked for this service; each person takes it at every location unless you pick locations for them.', 'aponto' )
									: __( 'Choose who can be booked for this service. Anyone you tick here is assigned at every location; staff already limited to specific locations keep that narrower scope, and are marked below.', 'aponto' ) }
							</p>
							{ catalogIncomplete ? (
								<p className="ap-field-error" role="status">{ __( 'Some locations could not be loaded, so where staff work cannot be changed right now. Reload the page to try again.', 'aponto' ) }</p>
							) : null }
							<label className="pd-compact-field">
								<input
									type="search"
									value={ query }
									placeholder=" "
									onChange={ ( e ) => setQuery( e.target.value ) }
								/>
								<span className="pd-compact-label">{ __( 'Search staff', 'aponto' ) }</span>
							</label>
							{ visible.length ? (
								<ul className="ap-eligibility-list">
									{ visible.map( ( option ) => {
										const id = Number( option.id );
										const ticked = selected.has( id );
										const title = titles.get( id );
										// D-R63: WHERE this member takes the service — only for a TICKED member on a
										// site with locations. Empty = "Every location" (the wildcard pair); picking
										// branches replaces their pairs with one per branch, and clearing them all
										// falls back to the wildcard — an assigned member never ends with no pair
										// (`lib/assignment-pairs.js`).
										const branchIds = hasBranches && ticked ? memberLocationIds( assignments, id ) : null;
										const items = branchIds ? branchItems( branchIds ) : null;

										// D-R64: ONE row per member — checkbox · name (+ job title) · email, and the
										// compact branch picker at the inline end of the same row. The "Locations for
										// <name>" text is the picker's accessible name, not a heading of its own.
										return (
											<li key={ option.id } className={ branchIds ? 'has-picker' : undefined }>
												<label>
													{ /* The admin's token-driven box (Bookings bulk select, the booking
													     inspector): a bare native checkbox stays a white square in the
													     dark scheme (browser QA 2026-09-28). */ }
													<input
														className="pd-table-checkbox"
														type="checkbox"
														// Named explicitly (T-078): a tool that reads the control
														// rather than its wrapping label announced every member
														// as "on".
														aria-label={ sprintf(
															/* translators: %s: staff member name. */
															__( 'Assign %s', 'aponto' ),
															option.label
														) }
														checked={ ticked }
														disabled={ saving }
														onChange={ () => setAssignments( ( current ) => toggleStaffAssignment( current, option.id ) ) }
													/>
													<span className="ap-eligibility-who">
														<span className="ap-eligibility-name">{ option.label }</span>
														{ title ? <span className="ap-eligibility-title">{ title }</span> : null }
														{ option.meta ? <span className="ap-eligibility-meta pd-ltr">{ option.meta }</span> : null }
													</span>
													{ /* Truthfulness, not decoration: this member's rows carry specific
													     locations, so the ticked box does NOT mean "every location" for
													     them. Unticking still removes every one of their rows. */ }
													{ ! hasBranches && locationScoped.has( id ) ? (
														<span className="ap-eligibility-scope">{ __( 'Specific locations', 'aponto' ) }</span>
													) : null }
												</label>
												{ branchIds ? (
													<div className="ap-eligibility-where">
														<MultiSelectPopover
															hideLabel
															label={ sprintf(
																/* translators: %s: staff member name. */
																__( 'Locations for %s', 'aponto' ),
																option.label
															) }
															value={ branchIds }
															items={ items }
															selectionText={ branchPickerSummary( branchIds, items, __( 'Every location', 'aponto' ) ) }
															noSelectionText={ __( 'Every location', 'aponto' ) }
															placeholder={ __( 'Every location', 'aponto' ) }
															searchPlaceholder={ __( 'Search locations…', 'aponto' ) }
															emptyText={ __( 'No matching locations.', 'aponto' ) }
															disabled={ saving || catalogIncomplete }
															onChange={ ( ids ) => setAssignments( ( current ) => setMemberLocations( current, option.id, ids ) ) }
														/>
													</div>
												) : null }
											</li>
										);
									} ) }
								</ul>
							) : (
								<p className="pd-editor-note">
									{ options.length
										? __( 'No staff match that search.', 'aponto' )
										: __( 'No active staff yet. Add someone on the Staff screen first.', 'aponto' ) }
								</p>
							) }
							<div className="ap-hours-save">
								<button type="button" className="pd-button primary sm" disabled={ saving || ! dirty } onClick={ saveNow }>
									{ saving ? __( 'Saving…', 'aponto' ) : __( 'Save assignments', 'aponto' ) }
								</button>
							</div>
						</>
					) : (
						<>
							<p className="pd-editor-note">{ __( 'Your staff member takes every service automatically.', 'aponto' ) }</p>
							{ assignments.length ? (
								<ul className="ap-eligibility-list is-readonly">
									{ [ ...selected ].map( ( id ) => (
										<li key={ id }>
											<span className="ap-eligibility-name">
												{ options.find( ( option ) => Number( option.id ) === id )?.label || sprintf(
													/* translators: %d: the numeric id of a staff member that could not be resolved to a name. */
													__( 'Staff #%d', 'aponto' ),
													id
												) }
											</span>
										</li>
									) ) }
								</ul>
							) : null }
						</>
					) }
				</>
			) }
		</EditorCard>
	);
}

/**
 * Service editor (SPEC-P1 §1.1) — full-page, five sections:
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
 *                           to choose between.
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
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { moduleAvailable } from '../modules/catalog.js';
import { minorToMajor, majorToMinor, maxPriceMajor, money, MAX_PRICE_MINOR, MAX_LEAD_MINUTES, MAX_HORIZON_DAYS } from '../lib/format.js';
import { staffOptions, filterOptions } from '../lib/combobox-options.js';
import { renderIcon } from '../lib/icon.jsx';
import { useToast } from '../lib/toast.jsx';
import { motionScrollBehavior } from '../lib/ui.jsx';

const STATUS_OPTIONS = [ { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' } ];
// R3 — full-page record-editor section nav (mockup .pd-record-editor-page).
const SECTIONS = [
	[ 'details', 'Details' ],
	[ 'public', 'Public content' ],
	[ 'pricing', 'Duration & price' ],
	[ 'assignments', 'Staff & locations' ],
	[ 'policy', 'Booking policy' ],
];

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
		min_lead_minutes: dto.min_lead_minutes ?? '',
		max_horizon_days: dto.max_horizon_days ?? '',
	};
}

function numOrNull( value ) {
	return String( value ).trim() === '' ? null : Number( value );
}

export function ServiceEditor( { mode, service, categories, onCreateCategory, onClose, onSaved } ) {
	const showToast = useToast();
	const multiStaff = moduleAvailable( config, 'multi_staff' );
	// A service created in THIS editor session (premium create-then-edit, see the file header).
	// Once set, the editor is editing that record: `creating` flips false, so Save becomes a
	// PATCH and the eligibility section — which needs a service id — comes alive.
	const [ createdId, setCreatedId ] = useState( null );
	const creating = mode === 'create' && null === createdId;
	const serviceId = service?.id ?? createdId;
	const [ loading, setLoading ] = useState( ! creating );
	const [ saving, setSaving ] = useState( false );
	// Pending eligibility edits, published by EligibilitySection as `{ dirty, save }` so the
	// page-level Save can flush them — the same one-continuous-form rule StaffWorkspace follows
	// for work hours (a section that silently drops a pending edit on unmount is a data-loss bug).
	const eligibilityRef = useRef( null );
	const [ form, setForm ] = useState( creating ? blank : () => ( service ? fromDto( service ) : blank() ) );
	const [ fieldError, setFieldError ] = useState( {} );
	const [ imageUrl, setImageUrl ] = useState( '' );
	const [ addingCategory, setAddingCategory ] = useState( false );
	const [ newCategory, setNewCategory ] = useState( '' );
	const [ active, setActive ] = useState( 'details' );
	const formRef = useRef( null );

	// Sticky section-nav scroll spy (mirrors StaffWorkspace). Page-level scroll,
	// so the observer roots on the viewport.
	useEffect( () => {
		if ( loading || ! formRef.current ) {
			return undefined;
		}
		const sections = SECTIONS.map( ( [ id ] ) => formRef.current.querySelector( `#service-${ id }` ) ).filter( Boolean );
		const observer = new IntersectionObserver(
			( entries ) => { entries.forEach( ( e ) => { if ( e.isIntersecting ) setActive( e.target.id.replace( 'service-', '' ) ); } ); },
			{ rootMargin: '-20% 0px -70% 0px', threshold: 0 }
		);
		sections.forEach( ( s ) => observer.observe( s ) );
		return () => observer.disconnect();
	}, [ loading ] );

	const scrollTo = ( id ) => formRef.current?.querySelector( `#service-${ id }` )?.scrollIntoView( { behavior: motionScrollBehavior(), block: 'start' } );

	// Edit: load a fresh copy so the editor never drifts from the list window.
	useEffect( () => {
		if ( creating || ! service?.id ) {
			return;
		}
		let live = true;
		api.get( `/services/${ service.id }` )
			.then( ( dto ) => { if ( live ) { setForm( fromDto( dto ) ); setLoading( false ); } } )
			.catch( () => { if ( live ) { setLoading( false ); } } );
		return () => { live = false; };
	}, [ creating, service ] );

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

	const confirmNewCategory = async () => {
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
	};

	const save = async () => {
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
		const lead = numOrNull( form.min_lead_minutes );
		if ( lead !== null && ( ! Number.isInteger( lead ) || lead < 0 || lead > MAX_LEAD_MINUTES ) ) {
			errors.min_lead_minutes = sprintf(
				/* translators: %d: the highest allowed lead time in minutes. */
				__( 'Lead time must be a whole number of minutes between 0 and %d.', 'aponto' ),
				MAX_LEAD_MINUTES
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
			min_lead_minutes: numOrNull( form.min_lead_minutes ),
			max_horizon_days: numOrNull( form.max_horizon_days ),
		};
		try {
			if ( creating ) {
				const created = await api.post( '/services', body );
				// AWAIT the parent reload before closing so the list/quick-view behind the editor
				// is already fresh when it reappears — no stale-price window (r1 item 9; U1 BUG-5).
				await onSaved?.();
				if ( multiStaff && created?.id ) {
					// Premium: the service exists but has NO eligible staff yet, so closing here
					// would hand back a service that cannot be booked and say nothing. Stay open on
					// the new record and point at the section that fixes it.
					setCreatedId( created.id );
					setSaving( false );
					showToast( `${ body.name } created — now choose who can be booked for it.` );
					scrollTo( 'assignments' );
					return;
				}
				showToast( `${ body.name } created.` );
				onClose?.();
				return;
			}

			await api.patch( `/services/${ serviceId }`, body );
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
			showToast( 'Service saved.' );
			await onSaved?.();
			onClose?.();
		} catch ( err ) {
			const fields = err.data?.fields;
			if ( fields ) {
				setFieldError( fields );
			}
			showToast( err.message, 'danger' );
			setSaving( false );
		}
	};

	const editorHead = ( strong ) => (
		<header className="pd-record-editor-head">
			<h1>
				<button type="button" onClick={ onClose }>Services</button>
				<span aria-hidden="true">{ renderIcon( 'chevron' ) }</span>
				<strong>{ strong }</strong>
			</h1>
			<div className="pd-record-editor-actions">
				<button className="pd-button" type="button" onClick={ onClose }>Cancel</button>
				<button className="pd-button primary" type="button" disabled={ saving || loading } onClick={ save }>{ saving ? 'Saving…' : creating ? 'Create service' : 'Save changes' }</button>
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
					{ SECTIONS.map( ( [ id, label ] ) => (
						<button key={ id } type="button" className={ active === id ? 'is-active' : undefined } aria-current={ active === id ? 'true' : undefined } onClick={ () => scrollTo( id ) }>{ label }</button>
					) ) }
				</aside>
				<form className="pd-record-editor-form" ref={ formRef } autoComplete="off" onSubmit={ ( e ) => e.preventDefault() }>
					{ /* 1. Details */ }
					<section id="service-details">
						<header><h2>Details</h2></header>
						<div className="pd-editor-section-body">
							<label className={ `pd-compact-field${ fieldError.name ? ' has-error' : '' }` }>
								<input name="name" value={ form.name } placeholder=" " required onChange={ set( 'name' ) } />
								<span className="pd-compact-label">Service name</span>
							</label>
							{ fieldError.name ? <p className="ap-field-error">{ fieldError.name }</p> : null }
							{ addingCategory ? (
								<div className="ap-inline-create">
									<label className="pd-compact-field"><input value={ newCategory } placeholder=" " autoFocus onChange={ ( e ) => setNewCategory( e.target.value ) } onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) { e.preventDefault(); confirmNewCategory(); } } } /><span className="pd-compact-label">New category name</span></label>
									<button className="pd-button primary sm" type="button" onClick={ confirmNewCategory }>Add</button>
									<button className="pd-button sm" type="button" onClick={ () => { setAddingCategory( false ); setNewCategory( '' ); } }>Cancel</button>
								</div>
							) : (
								<label className="pd-compact-field pd-compact-select is-filled">
									<select value={ form.category_id } onChange={ ( e ) => { if ( e.target.value === '__new' ) { setAddingCategory( true ); } else { setForm( ( f ) => ( { ...f, category_id: e.target.value } ) ); } } }>
										<option value="">Uncategorized</option>
										{ categories.map( ( c ) => <option key={ c.id } value={ c.id }>{ c.name }</option> ) }
										<option value="__new">+ New category…</option>
									</select>
									<span className="pd-compact-label">Category</span>
									<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
								</label>
							) }
							<label className="pd-compact-field pd-compact-notes"><textarea name="description" rows="3" placeholder=" " value={ form.description } onChange={ set( 'description' ) } /><span className="pd-compact-label">Description</span></label>
							<div className="pd-form-grid">
								<label className="pd-compact-field pd-compact-select is-filled">
									<select value={ form.status } onChange={ set( 'status' ) }>
										{ STATUS_OPTIONS.map( ( s ) => <option key={ s.value } value={ s.value }>{ s.label }</option> ) }
									</select>
									<span className="pd-compact-label">Status</span>
									<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
								</label>
								<div className="ap-image-field">
									{ imageUrl ? <img src={ imageUrl } alt="" className="ap-image-thumb" /> : <span className="ap-image-placeholder" aria-hidden="true">{ renderIcon( 'image' ) }</span> }
									<div className="ap-image-actions">
										<button className="pd-button sm" type="button" onClick={ pickImage }>{ form.image_id ? 'Change image' : 'Set featured image' }</button>
										{ form.image_id ? <button className="pd-button text sm" type="button" onClick={ () => { setForm( ( f ) => ( { ...f, image_id: null } ) ); setImageUrl( '' ); } }>Remove</button> : null }
									</div>
								</div>
							</div>
						</div>
					</section>

					{ /* 2. Public content & media — free-but-unbuilt seam (D-R22) */ }
					<section id="service-public">
						<header><h2>Public content &amp; media</h2><span className="pd-neutral-badge">{ __( 'Free — coming soon', 'aponto' ) }</span></header>
						<div className="pd-editor-section-body">
							<p className="pd-editor-note">{ __( 'Public title, booking visibility, card summary and gallery are part of the Service catalog module — free, and not built yet. They will appear here once it ships; no placeholder controls until then.', 'aponto' ) }</p>
						</div>
					</section>

					{ /* 3. Duration & price */ }
					<section id="service-pricing">
						<header><h2>Duration &amp; price</h2></header>
						<div className="pd-editor-section-body pd-form-grid">
							<label className={ `pd-compact-field${ fieldError.duration_minutes ? ' has-error' : '' }` }><input type="number" min="5" max="480" step="5" value={ form.duration_minutes } placeholder=" " onChange={ set( 'duration_minutes' ) } /><span className="pd-compact-label">Duration (minutes)</span></label>
							<label className={ `pd-compact-field${ fieldError.price_minor ? ' has-error' : '' }` }><input type="number" min="0" max={ maxPriceMajor() } step="any" value={ form.price } placeholder=" " onChange={ set( 'price' ) } /><span className="pd-compact-label">Price ({ config.currency })</span></label>
							{ fieldError.duration_minutes ? <p className="ap-field-error" style={ { gridColumn: '1 / -1' } }>{ fieldError.duration_minutes }</p> : null }
							{ fieldError.price_minor ? <p className="ap-field-error" style={ { gridColumn: '1 / -1' } }>{ fieldError.price_minor }</p> : null }
							<label className="pd-compact-field"><input type="number" min="0" max="120" value={ form.buffer_before } placeholder=" " onChange={ set( 'buffer_before' ) } /><span className="pd-compact-label">Buffer before (min)</span></label>
							<label className="pd-compact-field"><input type="number" min="0" max="120" value={ form.buffer_after } placeholder=" " onChange={ set( 'buffer_after' ) } /><span className="pd-compact-label">Buffer after (min)</span></label>
							<label className="pd-compact-field"><input type="number" min="5" max="480" step="5" value={ form.slot_step_minutes } placeholder=" " onChange={ set( 'slot_step_minutes' ) } /><span className="pd-compact-label">Slot step (blank = global)</span></label>
							<label className="ap-color-field">
								<span className="ap-color-label">Colour</span>
								<span className="ap-color-input"><input type="color" value={ form.color || '#3858e9' } onChange={ set( 'color' ) } />{ form.color ? <button type="button" className="pd-button text sm" onClick={ () => setForm( ( f ) => ( { ...f, color: '' } ) ) }>Clear</button> : <span className="pd-editor-note">Default</span> }</span>
							</label>
						</div>
					</section>

					{ /* 4. Staff & locations — eligible-staff editor (rest-contract §2.18) */ }
					<EligibilitySection
						serviceId={ serviceId }
						editable={ multiStaff }
						saveRef={ eligibilityRef }
						showToast={ showToast }
					/>

					{ /* 5. Booking policy */ }
					<section id="service-policy">
						<header><h2>Booking policy</h2></header>
						<div className="pd-editor-section-body pd-form-grid">
							<label className={ `pd-compact-field${ fieldError.min_lead_minutes ? ' has-error' : '' }` }><input type="number" min="0" max={ MAX_LEAD_MINUTES } step="1" value={ form.min_lead_minutes } placeholder=" " onChange={ set( 'min_lead_minutes' ) } /><span className="pd-compact-label">Min lead time (min · blank = global)</span></label>
							<label className={ `pd-compact-field${ fieldError.max_horizon_days ? ' has-error' : '' }` }><input type="number" min="1" max={ MAX_HORIZON_DAYS } step="1" value={ form.max_horizon_days } placeholder=" " onChange={ set( 'max_horizon_days' ) } /><span className="pd-compact-label">Max horizon (days · blank = global)</span></label>
							{ fieldError.min_lead_minutes ? <p className="ap-field-error" style={ { gridColumn: '1 / -1' } }>{ fieldError.min_lead_minutes }</p> : null }
							{ fieldError.max_horizon_days ? <p className="ap-field-error" style={ { gridColumn: '1 / -1' } }>{ fieldError.max_horizon_days }</p> : null }
						</div>
					</section>
					<footer className="pd-editor-footer">
						<button className="pd-button" type="button" onClick={ onClose }>Cancel</button>
						<button className="pd-button primary" type="button" disabled={ saving } onClick={ save }>{ saving ? 'Saving…' : creating ? 'Create service' : 'Save changes' }</button>
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
 * The Staff & locations section.
 *
 * Editable only when `multi_staff` is available (D-R28). Without it the Free plan auto-links its
 * single staff member on create, so there is nothing to choose
 * between — the section shows that linked member read-only rather than a control whose every
 * second option the server would refuse with 403 `aponto_plan_limit`.
 *
 * @param {{serviceId: ?number, editable: boolean, saveRef: Object, showToast: Function}} props Section props.
 */
function EligibilitySection( { serviceId, editable, saveRef, showToast } ) {
	const [ loading, setLoading ] = useState( Boolean( serviceId ) );
	const [ staff, setStaff ] = useState( [] );
	const [ assignments, setAssignments ] = useState( [] );
	// Signature of the assignment set the server currently holds — anything else is a pending
	// edit. `null` until a GET succeeds, so a failed load can never look "dirty" and have the page
	// Save replace a real assignment set with an empty one (the WorkHoursSection lesson).
	const [ baseline, setBaseline ] = useState( null );
	const [ query, setQuery ] = useState( '' );
	const [ saving, setSaving ] = useState( false );

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

	// Publish the pending edit to ServiceEditor so the page Save can flush it. Re-registered every
	// render so the closure over `assignments` is never stale.
	useEffect( () => {
		if ( ! saveRef ) {
			return undefined;
		}
		const handle = {
			dirty: null !== baseline && JSON.stringify( eligibilityRows( assignments ) ) !== baseline,
			save: () => persist( assignments ),
		};
		saveRef.current = handle;
		return () => {
			if ( saveRef.current === handle ) {
				saveRef.current = null;
			}
		};
	} );

	const selected = new Set( assignments.map( ( pair ) => Number( pair.staff_id ) ) );
	const locationScoped = locationScopedStaffIds( assignments );
	const options = staffOptions( staff );
	const visible = filterOptions( options, query );
	const dirty = null !== baseline && JSON.stringify( eligibilityRows( assignments ) ) !== baseline;

	const saveNow = async () => {
		try {
			await persist( assignments );
			showToast( 'Staff assignments saved.' );
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	// The unbookable warning. Any-staff availability resolves through `aponto_staff_services`, so
	// a service with no eligible staff returns NO slots — it goes invisible on the booking form
	// rather than visibly broken, which is exactly why this has to be stated here. Shown in both
	// modes: an empty set is equally unbookable on Free.
	const empty = ! loading && null !== baseline && 0 === assignments.length;

	return (
		<section id="service-assignments">
			<header><h2>Staff &amp; locations</h2></header>
			<div className="pd-editor-section-body">
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
								<p className="pd-editor-note">{ __( 'Choose who can be booked for this service. Anyone you tick here is assigned at every location; staff already limited to specific locations keep that narrower scope, and are marked below.', 'aponto' ) }</p>
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
										{ visible.map( ( option ) => (
											<li key={ option.id }>
												<label>
													<input
														type="checkbox"
														checked={ selected.has( Number( option.id ) ) }
														disabled={ saving }
														onChange={ () => setAssignments( ( current ) => toggleStaffAssignment( current, option.id ) ) }
													/>
													<span className="ap-eligibility-name">{ option.label }</span>
													{ /* Truthfulness, not decoration: this member's rows carry specific
													     locations, so the ticked box does NOT mean "every location" for
													     them. Unticking still removes every one of their rows. */ }
													{ locationScoped.has( Number( option.id ) ) ? (
														<span className="ap-eligibility-scope">{ __( 'Specific locations', 'aponto' ) }</span>
													) : null }
													{ option.meta ? <span className="ap-eligibility-meta pd-ltr">{ option.meta }</span> : null }
												</label>
											</li>
										) ) }
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
			</div>
		</section>
	);
}

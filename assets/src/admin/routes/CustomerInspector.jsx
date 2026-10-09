/**
 * Customer inspector (SPEC-P1 §1.5 / mockup §7.7 / §6.7). Shared in-flow inspector
 * with three modes: read-only Detail first (history + aggregates strip) → footer
 * "Edit customer"; Edit form; and Create directly. Sections Contact + Preferences.
 *
 * - First name* + last name* (name split, 2026-10-01) + a valid email are required; the API's
 *   422 keys `first_name` / `last_name` / `email` land inline (a duplicate normalised email is
 *   `data.fields.email`, SPEC-P0 §4.5).
 * - Internal notes are staff-only (never enter the booking form / notifications).
 * - Timezone is DERIVE read-only from the latest booking (Q4 — no editable field);
 *   a warning shows when it differs from the business timezone.
 * - No manual merge (V1) — dedupe is automatic on the normalised email.
 */
import { useState } from 'react';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { longDate, tzLabel } from '../lib/format.js';
import { renderIcon } from '../lib/icon.jsx';
import { fieldClass, fieldAria, FieldErrors } from '../lib/field-error.jsx';
import { displayName, normalizePart, initials } from '../../shared/person-name.js';
import { useToast } from '../lib/toast.jsx';

const TZ = config.business.timezone;

/** The `POST`/`PUT /customers` 422 keys this editor renders inline. */
const FIELD_KEYS = [ 'first_name', 'last_name', 'email', 'phone' ];

function AggregatesStrip( { row } ) {
	const last = row.lastBooking ? longDate( row.lastBooking ) : '—';
	return (
		<dl className="ap-aggregates-strip" aria-label="Customer activity">
			<div><dt>Total bookings</dt><dd>{ row.bookingsCount }</dd></div>
			<div><dt>Upcoming</dt><dd>{ row.upcoming }</dd></div>
			<div><dt>Last booking</dt><dd className="ap-aggregate-date">{ last }</dd></div>
			{ /* D-R33 — same quiet weight as the three beside it: a plain number, no tint, no
			     badge, no red at 3+. This strip reports a customer's history; it is not the
			     place to pass judgement on them. */ }
			<div><dt>No-shows</dt><dd>{ row.noShowCount || 0 }</dd></div>
		</dl>
	);
}

export function CustomerInspector( { mode: initialMode, row = null, onClose, onSaved } ) {
	const showToast = useToast();
	const [ mode, setMode ] = useState( initialMode ); // 'detail' | 'edit' | 'create'
	const [ saving, setSaving ] = useState( false );
	const [ form, setForm ] = useState( () => ( {
		first_name: row?.firstName || '',
		last_name: row?.lastName || '',
		email: row?.email || '',
		phone: row?.phone || '',
		note: row?.note || '',
	} ) );
	const [ fieldError, setFieldError ] = useState( {} );

	const creating = mode === 'create';
	const editing = mode === 'edit' || creating;
	const tzDiffers = row?.timezone && row.timezone !== TZ;

	const set = ( key ) => ( e ) => setForm( ( f ) => ( { ...f, [ key ]: e.target.value } ) );

	// D-R77: a customer the front desk booked WITHOUT an email (or a last name) can be saved without
	// one — the server allows a part that is not stored to stay absent, and never lets a stored one
	// be removed. A new customer still needs all three.
	const lastNameOptional = ! creating && ! row?.lastName;
	const emailOptional = ! creating && ! row?.email;

	const save = async () => {
		const errors = {};
		if ( ! normalizePart( form.first_name ) ) {
			errors.first_name = 'A first name is required.';
		}
		if ( ! normalizePart( form.last_name ) && ! lastNameOptional ) {
			errors.last_name = 'A last name is required.';
		}
		if ( ! /.+@.+\..+/.test( form.email.trim() ) && ! ( emailOptional && ! form.email.trim() ) ) {
			errors.email = 'A valid email is required.';
		}
		if ( Object.keys( errors ).length ) {
			setFieldError( errors );
			return;
		}
		setSaving( true );
		setFieldError( {} );
		try {
			const body = {
				first_name: normalizePart( form.first_name ),
				last_name: normalizePart( form.last_name ),
				email: form.email.trim(),
				phone: form.phone.trim(),
				note: form.note,
			};
			if ( creating ) {
				await api.post( '/customers', body );
				showToast( `${ displayName( body.first_name, body.last_name ) } added.`, 'success' );
			} else {
				await api.put( `/customers/${ row.id }`, { ...body, wp_user_id: row.wpUserId ?? null } );
				showToast( 'Customer updated.', 'success' );
			}
			onSaved?.();
			onClose?.();
		} catch ( err ) {
			const inline = {};
			for ( const key of FIELD_KEYS ) {
				if ( err.data?.fields?.[ key ] ) {
					inline[ key ] = err.data.fields[ key ];
				}
			}
			if ( Object.keys( inline ).length ) {
				setFieldError( inline );
			} else {
				showToast( err.message, 'danger' );
			}
			setSaving( false );
		}
	};

	const title = creating ? 'New customer' : editing ? 'Edit customer' : row?.name || 'Customer';

	const header = (
		<header className="pd-booking-inspector-head pd-booking-editor-head">
			<div className="pd-booking-inspector-identity"><h2 id="customerInspectorTitle">{ title }</h2></div>
			<button className="pd-icon-button" type="button" aria-label="Close customer inspector" onClick={ onClose }>{ renderIcon( 'close' ) }</button>
		</header>
	);

	// ---- Detail (read-only) ------------------------------------------------
	if ( mode === 'detail' && row ) {
		return (
			<>
				{ header }
				<div className="pd-booking-inspector-body">
					<div className="ap-inspector-identity">
						<span className="pmdk-avatar is-large" aria-hidden="true">{ initials( row.firstName, row.lastName ) || initials( row.name, '' ) || '?' }</span>
						<div><strong>{ row.name }</strong><span className="pd-ltr">{ row.email || 'No email' }</span></div>
					</div>
					<AggregatesStrip row={ row } />
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Contact</h3></div>
						<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Email</span><strong className="pd-ltr">{ row.email || '—' }</strong></div>
						<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Phone</span><strong className="pd-ltr">{ row.phone || '—' }</strong></div>
						<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Timezone</span><strong>{ row.timezone ? tzLabel( row.timezone ) : 'Not yet known' }</strong></div>
						{ tzDiffers ? <p className="ap-inspector-warning">{ renderIcon( 'clock' ) }<span>Differs from your business timezone on the last booking.</span></p> : null }
					</section>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Internal notes</h3></div>
						{ row.note ? <p className="ap-inspector-note">{ row.note }</p> : <p className="pd-editor-note">No internal notes. Visible to staff only.</p> }
					</section>
				</div>
				<footer className="pd-drawer-foot pd-booking-inspector-foot">
					<div className="pd-inspector-foot-actions">
						<button className="pd-button primary sm" type="button" onClick={ () => setMode( 'edit' ) }>{ renderIcon( 'note' ) }Edit customer</button>
					</div>
				</footer>
			</>
		);
	}

	// ---- Edit / Create -----------------------------------------------------
	return (
		<>
			{ header }
			<form className="pd-booking-inspector-body pd-compact-editor" autoComplete="off" onSubmit={ ( e ) => e.preventDefault() }>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Contact</h3></div>
					<div className="pd-field-grid">
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'first_name' ) }>
							<input name="first_name" value={ form.first_name } placeholder=" " required { ...fieldAria( 'customer', fieldError, 'first_name' ) } onChange={ set( 'first_name' ) } />
							<span className="pd-compact-label">First name</span>
						</label>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'last_name' ) }>
							<input name="last_name" value={ form.last_name } placeholder=" " required={ ! lastNameOptional } { ...fieldAria( 'customer', fieldError, 'last_name' ) } onChange={ set( 'last_name' ) } />
							<span className="pd-compact-label">Last name</span>
						</label>
					</div>
					<FieldErrors prefix="customer" fieldError={ fieldError } keys={ [ 'first_name', 'last_name' ] } />
					{ /* Same two-row grid as the booking editor's new customer: names, then contact. */ }
					<div className="pd-field-grid">
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'email' ) }>
							<input className="pd-ltr" type="email" name="email" value={ form.email } placeholder=" " required={ ! emailOptional } { ...fieldAria( 'customer', fieldError, 'email' ) } onChange={ set( 'email' ) } />
							<span className="pd-compact-label">Email</span>
						</label>
						<label className={ fieldClass( 'pd-compact-field', fieldError, 'phone' ) }>
							<input className="pd-ltr" name="phone" value={ form.phone } placeholder=" " { ...fieldAria( 'customer', fieldError, 'phone' ) } onChange={ set( 'phone' ) } />
							<span className="pd-compact-label">Phone</span>
						</label>
					</div>
					<FieldErrors prefix="customer" fieldError={ fieldError } keys={ [ 'email', 'phone' ] } />
				</section>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Preferences</h3></div>
					{ ! creating && row?.timezone ? (
						<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Timezone</span><strong>{ tzLabel( row.timezone ) }</strong></div>
					) : (
						<p className="pd-editor-note">Timezone is derived from the customer's most recent booking — not editable.</p>
					) }
					{ tzDiffers ? <p className="ap-inspector-warning">{ renderIcon( 'clock' ) }<span>Differs from your business timezone on the last booking.</span></p> : null }
					<label className="pd-compact-field pd-compact-notes">
						<textarea name="note" rows="3" placeholder=" " value={ form.note } onChange={ set( 'note' ) } />
						<span className="pd-compact-label">Internal note (staff only)</span>
					</label>
				</section>
			</form>
			<footer className="pd-drawer-foot pd-booking-inspector-foot">
				<div className="pd-inspector-foot-actions">
					<button className="pd-button sm" type="button" onClick={ creating ? onClose : () => setMode( 'detail' ) }>Cancel</button>
					<button className="pd-button primary sm" type="button" disabled={ saving } onClick={ save }>{ saving ? 'Saving…' : creating ? 'Add customer' : 'Save changes' }</button>
				</div>
			</footer>
		</>
	);
}

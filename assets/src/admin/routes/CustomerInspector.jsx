/**
 * Customer inspector (SPEC-P1 §1.5 / mockup §7.7 / §6.7). Shared in-flow inspector
 * with three modes: read-only Detail first (history + aggregates strip) → footer
 * "Edit customer"; Edit form; and Create directly. Sections Contact + Preferences.
 *
 * - name* + a valid email are required; a duplicate normalised email is rejected
 *   inline from the API's 422 (`data.fields.email`, SPEC-P0 §4.5).
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
import { useToast } from '../lib/toast.jsx';

const TZ = config.business.timezone;

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
		name: row?.name || '',
		email: row?.email || '',
		phone: row?.phone || '',
		note: row?.note || '',
	} ) );
	const [ fieldError, setFieldError ] = useState( {} );

	const creating = mode === 'create';
	const editing = mode === 'edit' || creating;
	const tzDiffers = row?.timezone && row.timezone !== TZ;

	const set = ( key ) => ( e ) => setForm( ( f ) => ( { ...f, [ key ]: e.target.value } ) );

	const save = async () => {
		const errors = {};
		if ( ! form.name.trim() ) {
			errors.name = 'A name is required.';
		}
		if ( ! /.+@.+\..+/.test( form.email.trim() ) ) {
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
				name: form.name.trim(),
				email: form.email.trim(),
				phone: form.phone.trim(),
				note: form.note,
			};
			if ( creating ) {
				await api.post( '/customers', body );
				showToast( `${ body.name } added.` );
			} else {
				await api.put( `/customers/${ row.id }`, { ...body, wp_user_id: row.wpUserId ?? null } );
				showToast( 'Customer updated.' );
			}
			onSaved?.();
			onClose?.();
		} catch ( err ) {
			const emailError = err.data?.fields?.email;
			if ( emailError ) {
				setFieldError( { email: emailError } );
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
						<span className="pmdk-avatar is-large" aria-hidden="true">{ ( row.name || '?' ).trim().charAt( 0 ).toUpperCase() }</span>
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
					<label className={ `pd-compact-field${ fieldError.name ? ' has-error' : '' }` }>
						<input name="name" value={ form.name } placeholder=" " required onChange={ set( 'name' ) } />
						<span className="pd-compact-label">Full name</span>
					</label>
					{ fieldError.name ? <p className="ap-field-error">{ fieldError.name }</p> : null }
					<label className={ `pd-compact-field${ fieldError.email ? ' has-error' : '' }` }>
						<input className="pd-ltr" type="email" name="email" value={ form.email } placeholder=" " required onChange={ set( 'email' ) } />
						<span className="pd-compact-label">Email</span>
					</label>
					{ fieldError.email ? <p className="ap-field-error">{ fieldError.email }</p> : null }
					<label className="pd-compact-field">
						<input className="pd-ltr" name="phone" value={ form.phone } placeholder=" " onChange={ set( 'phone' ) } />
						<span className="pd-compact-label">Phone</span>
					</label>
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

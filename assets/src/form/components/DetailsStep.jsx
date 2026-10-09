/** @jsxImportSource preact */
/**
 * Step 3 — Your details (SPEC-P1 §2.2 #3).
 *
 * First name, last name and email are always required (the two name parts are
 * separate inputs since the name split, 2026-10-01 — side by side on a wide
 * content column, stacked on a narrow one); phone follows the admin setting
 * (off / optional / required); an optional note is included. The consent
 * checkbox is a structural seam wired to the `consent_enabled` setting — present
 * and enforceable, kept off by default until P1b turns it on. A honeypot field
 * (offscreen, tabindex -1, aria-hidden) backs the server guard seam; it is never
 * part of the request body. Server 422 field errors map under each input with
 * `aria-invalid` + focus to the first bad field.
 *
 * The final Book CTA lives here — submitting POSTs the booking (there is no
 * separate Review step in V1).
 */
import { __ } from '@wordpress/i18n';
import { useRef, useEffect } from 'preact/hooks';
import { StepHeader } from './StepHeader.jsx';
import { Footer } from './Footer.jsx';
import { COPY } from '../lib/copy.js';

const BUILT_IN_ORDER = [
	'first_name',
	'last_name',
	'email',
	'phone',
	'consent',
];

/** The error-map key for one custom field — the server's own 422 field key. */
export const customKey = ( slug ) => 'custom_fields.' + slug;

export function DetailsStep( {
	identityEnabled = true,
	locked = false,
	details,
	onChange,
	phoneMode,
	consentEnabled,
	consentText,
	consent,
	onConsentChange,
	customFields,
	customValues,
	onCustomChange,
	// An edition-owned extra control (`{key, render}` or null), rendered after
	// the custom fields: its `key` is the server's 422 field key, so errors and
	// focus-first-error treat it like any other field. Null in Free.
	extraField = null,
	honeypot,
	onHoneypot,
	fieldErrors,
	banner,
	stepIndex,
	progress,
	stepCount,
	focusOnMount,
	onBack,
	onSubmit,
	// The Details CTA is only FINAL when nothing follows it. On a site that takes
	// payment for this service it is a plain "Continue" and the Book CTA moves to
	// the Payment step, which is also where the idempotency key is minted.
	primaryLabel = COPY.book,
	submitting,
} ) {
	const refs = {
		first_name: useRef( null ),
		last_name: useRef( null ),
		email: useRef( null ),
		phone: useRef( null ),
		consent: useRef( null ),
	};
	// One ref per custom field would break the rules of hooks (the list is
	// config-driven), so the controls register themselves in a single map.
	const customRefs = useRef( {} );
	const custom = customFields || [];
	const values = customValues || {};

	useEffect( () => {
		if ( ! fieldErrors ) {
			return;
		}
		// Custom fields render after the built-ins, so focus-first-error follows
		// the same visual order the visitor reads in.
		const order = BUILT_IN_ORDER.concat(
			custom.map( ( f ) => customKey( f.slug ) )
		);
		if ( extraField && extraField.key ) {
			order.push( extraField.key );
		}
		const first = order.find( ( f ) => fieldErrors[ f ] );
		if ( ! first ) {
			return;
		}
		const target = refs[ first ]
			? refs[ first ].current
			: customRefs.current[ first ];
		if ( target ) {
			target.focus();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ fieldErrors ] );

	const err = fieldErrors || {};

	function customControl( f ) {
		const key = customKey( f.slug );
		const bad = !! err[ key ];
		const id = 'ap-cf-' + f.slug;
		const errId = id + '-err';
		const value = values[ f.slug ];
		const marker = f.required ? (
			<span class="req">*</span>
		) : (
			<span class="opt">{ COPY.phone_optional }</span>
		);
		const shared = {
			id,
			ref: ( el ) => {
				customRefs.current[ key ] = el;
			},
			'aria-invalid': bad ? 'true' : 'false',
			'aria-describedby': bad ? errId : undefined,
			// The `*` marker is visual only; assistive tech needs the attribute.
			'aria-required': f.required ? 'true' : undefined,
		};
		const onInput = ( e ) => onCustomChange( f.slug, e.target.value );

		let control;
		if ( f.type === 'checkbox' ) {
			control = (
				<label class="ap-consent">
					<input
						id={ id }
						ref={ ( el ) => {
							customRefs.current[ key ] = el;
						} }
						type="checkbox"
						checked={ !! value }
						aria-required={ f.required ? 'true' : undefined }
						aria-invalid={ bad ? 'true' : 'false' }
						aria-describedby={ bad ? errId : undefined }
						onChange={ ( e ) =>
							onCustomChange( f.slug, e.target.checked )
						}
					/>
					<span>
						{ f.label } { f.required && <span class="req">*</span> }
					</span>
				</label>
			);
		} else if ( f.type === 'textarea' ) {
			control = (
				<textarea
					{ ...shared }
					class="ap-textarea"
					value={ value || '' }
					maxlength={ f.maxLength || undefined }
					onInput={ onInput }
				/>
			);
		} else if ( f.type === 'select' ) {
			control = (
				<select
					{ ...shared }
					class="ap-select"
					value={ value || '' }
					onChange={ ( e ) =>
						onCustomChange( f.slug, e.target.value )
					}
				>
					<option value="">{ COPY.select_placeholder }</option>
					{ f.options.map( ( o ) => (
						<option key={ o.value } value={ o.value }>
							{ o.label }
						</option>
					) ) }
				</select>
			);
		} else {
			control = (
				<input
					{ ...shared }
					type="text"
					class="ap-input"
					value={ value || '' }
					maxlength={ f.maxLength || undefined }
					onInput={ onInput }
				/>
			);
		}

		return (
			<div key={ f.slug } class={ 'ap-field' + ( bad ? ' bad' : '' ) }>
				{ f.type !== 'checkbox' && (
					<label class="ap-label" for={ id }>
						{ f.label } { marker }
					</label>
				) }
				{ control }
				{ bad && (
					<p class="ap-err" id={ errId }>
						{ err[ key ] }
					</p>
				) }
			</div>
		);
	}

	function field( name, labelNode, inputProps ) {
		const bad = !! err[ name ];
		return (
			<div class={ 'ap-field' + ( bad ? ' bad' : '' ) }>
				<label class="ap-label" for={ 'ap-' + name }>
					{ labelNode }
				</label>
				<input
					id={ 'ap-' + name }
					ref={ refs[ name ] }
					class="ap-input"
					value={ details[ name ] || '' }
					aria-invalid={ bad ? 'true' : 'false' }
					aria-describedby={ bad ? 'ap-' + name + '-err' : undefined }
					onInput={ ( e ) => onChange( name, e.target.value ) }
					{ ...inputProps }
				/>
				{ bad && (
					<p class="ap-err" id={ 'ap-' + name + '-err' }>
						{ err[ name ] }
					</p>
				) }
			</div>
		);
	}

	const emailField = field(
		'email',
		<span>
			{ COPY.email_label } <span class="req">*</span>
		</span>,
		{
			type: 'email',
			autocomplete: 'email',
			placeholder: COPY.email_placeholder,
			inputmode: 'email',
		}
	);

	return (
		<div class="ap-step">
			<StepHeader
				title={
					identityEnabled
						? COPY.details_title
						: __( 'Booking details', 'aponto' )
				}
				sub={ identityEnabled ? COPY.details_sub : null }
				stepIndex={ stepIndex }
				progress={ progress }
				stepCount={ stepCount }
				focusOnMount={ focusOnMount }
			/>

			{ banner }

			<fieldset
				disabled={ locked }
				style={ { border: 0, padding: 0, margin: 0, minWidth: 0 } }
			>
				{ identityEnabled && (
					<div class="ap-split-row">
						{ field(
							'first_name',
							<span>
								{ COPY.first_name_label }{ ' ' }
								<span class="req">*</span>
							</span>,
							{
								type: 'text',
								autocomplete: 'given-name',
								placeholder: COPY.first_name_placeholder,
							}
						) }
						{ field(
							'last_name',
							<span>
								{ COPY.last_name_label }{ ' ' }
								<span class="req">*</span>
							</span>,
							{
								type: 'text',
								autocomplete: 'family-name',
								placeholder: COPY.last_name_placeholder,
							}
						) }
					</div>
				) }

				{ /* Email + phone share a split row like the two name parts; with the phone field
				     switched off the email keeps the full width rather than half a row. */ }
				{ identityEnabled &&
					( phoneMode !== 'off' ? (
						<div class="ap-split-row">
							{ emailField }
							{ field(
								'phone',
								<span>
									{ COPY.phone_label }{ ' ' }
									{ phoneMode === 'required' ? (
										<span class="req">*</span>
									) : (
										<span class="opt">
											{ COPY.phone_optional }
										</span>
									) }
								</span>,
								{
									type: 'tel',
									autocomplete: 'tel',
									inputmode: 'tel',
								}
							) }
						</div>
					) : (
						emailField
					) ) }

				{ identityEnabled && (
					<div class="ap-field">
						<label class="ap-label" for="ap-note">
							{ COPY.note_label }{ ' ' }
							<span class="opt">{ COPY.note_optional }</span>
						</label>
						<textarea
							id="ap-note"
							class="ap-textarea"
							value={ details.note || '' }
							placeholder={ COPY.note_placeholder }
							onInput={ ( e ) =>
								onChange( 'note', e.target.value )
							}
						/>
					</div>
				) }

				{ /* The site's own extra questions (D-R30) — rendered from data, in
			     admin order, between the built-in details and consent. */ }
				{ custom.map( customControl ) }

				{ extraField &&
					extraField.key &&
					extraField.render( {
						error: err[ extraField.key ] || '',
						inputRef: ( el ) => {
							customRefs.current[ extraField.key ] = el;
						},
					} ) }

				{ consentEnabled && (
					<div class={ 'ap-field' + ( err.consent ? ' bad' : '' ) }>
						<label class="ap-consent">
							<input
								ref={ refs.consent }
								type="checkbox"
								checked={ !! consent }
								aria-required="true"
								aria-invalid={ err.consent ? 'true' : 'false' }
								onChange={ ( e ) =>
									onConsentChange( e.target.checked )
								}
							/>
							<span>
								{ consentText || COPY.consent_default }{ ' ' }
								<span class="req">*</span>
							</span>
						</label>
						{ err.consent && (
							<p class="ap-err" style={ { display: 'block' } }>
								{ err.consent }
							</p>
						) }
					</div>
				) }

				{ /* Honeypot — offscreen, never submitted; backs the server guard seam. */ }
				<div class="ap-honeypot" aria-hidden="true">
					<label>
						Leave this field empty
						<input
							type="text"
							tabIndex={ -1 }
							autocomplete="off"
							value={ honeypot }
							onInput={ ( e ) => onHoneypot( e.target.value ) }
						/>
					</label>
				</div>
			</fieldset>
			<Footer
				onBack={ onBack }
				backDisabled={ locked }
				onPrimary={ onSubmit }
				primaryLabel={ primaryLabel }
				busy={ submitting }
				busyLabel={ COPY.saving }
			/>
		</div>
	);
}

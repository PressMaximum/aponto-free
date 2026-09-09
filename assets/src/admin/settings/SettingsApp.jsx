/**
 * Settings sections (SPEC-P1 §1.6) rendered schema-driven from
 * `config.settingsSchema` (tab/panel metadata straight from the PHP schema,
 * SPEC-P0 §4.3) through the dashboard-kit SchemaForm + SaveBar.
 *
 * The caller (routes/SettingsRoute.jsx) resolves the mockup's parent → child tree
 * (settings/ia.js) into the two props this component takes: `panels`, the schema
 * PANEL slugs to render in schema order, and `extras`, the non-schema surfaces
 * appended below them. Notifications is a component section handled by the caller
 * (the B3 template editor, unchanged).
 *
 * Save contract (rest-contract §2.11 / D-16): `PUT /settings` is a FULL replacement
 * — any schema key absent from the body resets to its default. So the client holds
 * the complete GET payload and round-trips it on every save; only the edited keys
 * change, and nothing hidden (appearance, flood caps, …) is lost. Strict validation
 * failures come back as a 422 field map and render inline under the offending field.
 *
 * Concurrency (§2.11 addendum 2026-07-19 C1): the GET payload carries a `revision`
 * token that rides the round-trip untouched; a save against a stale revision comes
 * back `409 aponto_settings_conflict` and renders a conflict banner with an explicit
 * Reload action — never an automatic overwrite.
 *
 * Dirty guard (C1 review fix 2): while edits are pending this form registers a nav
 * guard; sub-tab switches and route changes ask through a ConfirmDialog instead of
 * silently unmounting. Browser unload stays covered by the kit useDirtyState.
 *
 * THEME SEAM: plain @wordpress/components + kit primitives styled by `--ap-*`/`--pmdk-*`
 * tokens. No `.pd-*` production classes are authored here.
 */
import {
	Button,
	BaseControl,
	Card,
	CardBody,
	CardHeader,
	Notice,
	Spinner,
	TextareaControl,
	__experimentalConfirmDialog as ConfirmDialog,
} from '@wordpress/components';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	SchemaForm,
	SaveBar,
	BASE_FIELD_TYPES,
	panelHeadingId,
	useDirtyState,
} from '@pressmaximum/dashboard-kit';

import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { currencyChangeRequiresConfirm } from '../lib/currency-guard.js';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { setNavGuard, clearNavGuard } from '../lib/nav-guard.js';
import { RouteError, RouteLoading } from '../lib/ui.jsx';
import { FIELD_META, PANEL_META, controlForType } from './catalog.js';
import BusinessHoursPanel from './BusinessHoursPanel.jsx';

/** Textarea control — extends the kit's base field types (address, consent text). */
function TextareaField( { field, value, onChange } ) {
	return (
		<TextareaControl
			__nextHasNoMarginBottom
			label={ field.label }
			help={ field.description }
			rows={ field.rows || 3 }
			value={ value === null || value === undefined ? '' : String( value ) }
			onChange={ onChange }
		/>
	);
}

/** Best-fit menu unit for a stored value: the largest that divides it evenly (else the base). */
function bestDurationUnit( value, units ) {
	if ( value === null || value === undefined || value === '' || Number( value ) === 0 ) {
		return units[ 0 ].value;
	}
	const num = Number( value );
	for ( let i = units.length - 1; i >= 0; i-- ) {
		if ( num % units[ i ].factor === 0 ) {
			return units[ i ].value;
		}
	}
	return units[ 0 ].value;
}

/**
 * Value + unit control (C5). Stores the canonical unit (minutes for lead time, days for the booking
 * window); switching the menu re-expresses that number in minutes/hours/days without changing what
 * is stored, so the schema value and the availability engine stay in the same units they always were.
 *
 * Bounds + fractional entry (review F item 7): `field.min`/`field.max` are CANONICAL-unit bounds —
 * the emitted value clamps into them (the booking window can never emit 0, which the server
 * rejects), and the number input's min/max/step re-express them in the selected unit, with a 0.5
 * step for the larger units ("1.5 hours" → 90 minutes).
 */
function DurationField( { field, value, onChange } ) {
	const units = field.units && field.units.length ? field.units : [ { value: 'value', label: '', factor: 1 } ];
	const [ unit, setUnit ] = useState( () => bestDurationUnit( value, units ) );
	const active = units.find( ( u ) => u.value === unit ) || units[ 0 ];
	const minCanonical = Number.isFinite( field.min ) ? field.min : 0;
	const maxCanonical = Number.isFinite( field.max ) ? field.max : Infinity;
	const num = value === null || value === undefined || value === '' ? null : Number( value );
	const amount = num === null ? '' : num / active.factor;
	const [ inputId ] = useState( () => `ap-duration-${ Math.random().toString( 36 ).slice( 2, 9 ) }` );
	const emit = ( raw ) => {
		if ( raw === '' || raw === null || Number.isNaN( Number( raw ) ) ) {
			onChange( '' );
			return;
		}
		const canonical = Math.round( Number( raw ) * active.factor );
		onChange( Math.min( maxCanonical, Math.max( minCanonical, canonical ) ) );
	};
	return (
		<BaseControl __nextHasNoMarginBottom label={ field.label } help={ field.description } id={ inputId } className="ap-duration-field">
			<div className="ap-duration-controls">
				<input
					id={ inputId }
					type="number"
					min={ minCanonical / active.factor }
					max={ Number.isFinite( maxCanonical ) ? maxCanonical / active.factor : undefined }
					step={ active.inputStep || 1 }
					className="components-text-control__input ap-duration-number"
					value={ amount }
					onChange={ ( e ) => emit( e.target.value ) }
				/>
				<select
					className="components-select-control__input ap-duration-unit"
					aria-label={ __( 'Unit', 'aponto' ) }
					value={ unit }
					onChange={ ( e ) => setUnit( e.target.value ) }
				>
					{ units.map( ( u ) => <option key={ u.value } value={ u.value }>{ u.label }</option> ) }
				</select>
			</div>
		</BaseControl>
	);
}

const FIELD_TYPES = { ...BASE_FIELD_TYPES, textarea: TextareaField, duration: DurationField };

/** Flatten the nested `GET /settings` DTO into the flat, dotted schema keys. */
function flatten( dto ) {
	const flat = {};
	Object.keys( dto || {} ).forEach( ( key ) => {
		const value = dto[ key ];
		if ( value && typeof value === 'object' && ! Array.isArray( value ) ) {
			Object.keys( value ).forEach( ( leaf ) => {
				flat[ `${ key }.${ leaf }` ] = value[ leaf ];
			} );
		} else {
			flat[ key ] = value;
		}
	} );
	return flat;
}

/** Rebuild the nested PUT payload from a flat, dotted map. */
function unflatten( flat ) {
	const dto = {};
	Object.keys( flat ).forEach( ( key ) => {
		const dot = key.indexOf( '.' );
		if ( dot === -1 ) {
			dto[ key ] = flat[ key ];
			return;
		}
		const group = key.slice( 0, dot );
		const leaf = key.slice( dot + 1 );
		if ( ! dto[ group ] || typeof dto[ group ] !== 'object' ) {
			dto[ group ] = {};
		}
		dto[ group ][ leaf ] = flat[ key ];
	} );
	return dto;
}

/** Coerce a control's raw value back to the schema type so dirty-diffing + save are exact. */
function coerce( type, raw ) {
	if ( type === 'int' ) {
		return raw === '' || raw === null || raw === undefined ? null : Number( raw );
	}
	if ( type === 'bool' ) {
		return Boolean( raw );
	}
	return raw === null || raw === undefined ? '' : String( raw );
}

export default function SettingsApp( { panels = [], extras = [] } ) {
	const { confirm, dialog } = useConfirmDialog();
	const [ savedFlat, setSavedFlat ] = useState( null );
	const [ edited, setEdited ] = useState( {} );
	const [ fieldErrors, setFieldErrors ] = useState( {} );
	const [ loading, setLoading ] = useState( true );
	const [ loadError, setLoadError ] = useState( '' );
	const [ saving, setSaving ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ notice, setNotice ] = useState( '' );
	const [ conflict, setConflict ] = useState( false );
	const [ pendingNav, setPendingNav ] = useState( null );

	const schema = config.settingsSchema;
	const typeByKey = useMemo( () => {
		const map = {};
		schema.forEach( ( entry ) => {
			map[ entry.key ] = entry.type;
		} );
		return map;
	}, [ schema ] );

	const isDirty = Object.keys( edited ).length > 0;

	const { setDirty } = useDirtyState( 'aponto-settings', {
		onDiscard: () => {
			setEdited( {} );
			setFieldErrors( {} );
		},
		discardMessage: __( 'You have unsaved settings. Discard them?', 'aponto' ),
	} );
	useEffect( () => setDirty( isDirty ), [ isDirty, setDirty ] );

	// Nav guard (C1 review fix 2): while dirty, in-app navigation asks first.
	// The handler stashes the navigation intent; the ConfirmDialog below decides.
	const guardHandlerRef = useRef( null );
	useEffect( () => {
		if ( ! isDirty ) {
			return undefined;
		}
		const handler = ( proceed, cancel ) => setPendingNav( { proceed, cancel } );
		guardHandlerRef.current = handler;
		setNavGuard( handler );
		return () => {
			clearNavGuard( handler );
			if ( guardHandlerRef.current === handler ) {
				guardHandlerRef.current = null;
			}
		};
	}, [ isDirty ] );

	const confirmPendingNav = () => {
		const nav = pendingNav;
		setPendingNav( null );
		setEdited( {} );
		setFieldErrors( {} );
		// Clear the guard synchronously — the state flip above only unregisters it
		// on the NEXT render, which would re-intercept the navigation we resume.
		if ( guardHandlerRef.current ) {
			clearNavGuard( guardHandlerRef.current );
			guardHandlerRef.current = null;
		}
		nav?.proceed();
	};

	const cancelPendingNav = () => {
		const nav = pendingNav;
		setPendingNav( null );
		nav?.cancel?.();
	};

	const load = () => {
		setLoading( true );
		setLoadError( '' );
		setConflict( false );
		api
			.get( '/settings' )
			.then( ( dto ) => {
				setSavedFlat( flatten( dto ) );
				setLoading( false );
			} )
			.catch( ( err ) => {
				setLoadError( err.message || __( 'Could not load settings.', 'aponto' ) );
				setLoading( false );
			} );
	};

	useEffect( load, [] );

	// Conflict reload (§2.11 addendum): explicit, never automatic — discards the
	// local edits and re-fetches the server truth (fresh values + revision).
	const reloadAfterConflict = () => {
		setEdited( {} );
		setFieldErrors( {} );
		setError( '' );
		load();
	};

	const currentValue = ( key ) =>
		Object.prototype.hasOwnProperty.call( edited, key ) ? edited[ key ] : ( savedFlat || {} )[ key ];

	const onFieldChange = ( _panelId, key, next ) => {
		const value = coerce( typeByKey[ key ], next );
		setEdited( ( prev ) => {
			const out = { ...prev };
			if ( Object.is( value, ( savedFlat || {} )[ key ] ) ) {
				delete out[ key ];
			} else {
				out[ key ] = value;
			}
			return out;
		} );
		setFieldErrors( ( prev ) => {
			if ( ! prev[ key ] ) {
				return prev;
			}
			const out = { ...prev };
			delete out[ key ];
			return out;
		} );
		setNotice( '' );
	};

	const save = async () => {
		// Currency changes re-interpret every stored price at the new ISO exponent — explicit
		// in-app confirm before proceeding (Codex review item 1; C13 / review F item 3 replaced
		// the browser-native confirm with the shared Modal dialog).
		if ( currencyChangeRequiresConfirm( savedFlat, edited ) ) {
			const ok = await confirm( {
				title: __( 'Change the store currency?', 'aponto' ),
				message: __(
					'Existing prices keep their numbers but will be read in the new currency — review your service prices after saving.',
					'aponto'
				),
				confirmText: __( 'Change currency', 'aponto' ),
			} );
			if ( ! ok ) {
				return;
			}
		}
		setSaving( true );
		setError( '' );
		setNotice( '' );
		setFieldErrors( {} );
		const payload = unflatten( { ...savedFlat, ...edited } );
		api
			.put( '/settings', payload )
			.then( ( dto ) => {
				setSavedFlat( flatten( dto ) );
				setEdited( {} );
				setSaving( false );
				setConflict( false );
				setNotice( __( 'Settings saved.', 'aponto' ) );
			} )
			.catch( ( err ) => {
				setSaving( false );
				if ( err.status === 409 && err.code === 'aponto_settings_conflict' ) {
					// Stale revision — someone else saved since this form loaded.
					// Banner + explicit Reload; never overwrite automatically.
					setConflict( true );
				} else if ( err.status === 422 && err.data && err.data.fields ) {
					setFieldErrors( err.data.fields );
					setError( __( 'Some settings need attention — see the highlighted fields.', 'aponto' ) );
				} else {
					setError( err.message || __( 'Could not save settings.', 'aponto' ) );
				}
			} );
	};

	const discard = async () => {
		// In-app dialog (C13 / review F item 3): destructive styling — the edits are lost for good.
		if (
			! isDirty ||
			( await confirm( {
				title: __( 'Discard your unsaved changes?', 'aponto' ),
				message: __( 'Everything you edited since the last save will be lost.', 'aponto' ),
				confirmText: __( 'Discard changes', 'aponto' ),
				cancelText: __( 'Keep editing', 'aponto' ),
				destructive: true,
			} ) )
		) {
			setEdited( {} );
			setFieldErrors( {} );
			setError( '' );
		}
	};

	if ( loading ) {
		return <RouteLoading label={ __( 'Loading settings…', 'aponto' ) } />;
	}
	if ( loadError ) {
		return <RouteError message={ loadError } onRetry={ load } />;
	}

	const sectionPanels = panelsForSection( schema, panels, currentValue, fieldErrors );

	return (
		<div className="ap-settings-app">
			{ conflict ? (
				<Notice status="error" isDismissible={ false } className="ap-settings-conflict">
					<div className="ap-settings-conflict-body">
						<span>
							{ __(
								'Settings changed elsewhere — reload to get the latest values. Reloading discards your unsaved edits.',
								'aponto'
							) }
						</span>
						<Button variant="secondary" onClick={ reloadAfterConflict }>
							{ __( 'Reload settings', 'aponto' ) }
						</Button>
					</div>
				</Notice>
			) : null }
			{ error ? (
				<Notice status="error" isDismissible onRemove={ () => setError( '' ) }>
					{ error }
				</Notice>
			) : null }
			{ notice ? (
				<Notice status="success" isDismissible onRemove={ () => setNotice( '' ) }>
					{ notice }
				</Notice>
			) : null }

			{ sectionPanels.map( ( { panel, values } ) => (
				<Card key={ panel.id } className="ap-settings-card">
					<CardHeader>
						<div>
							<h2 id={ panelHeadingId( panel.id ) } className="ap-settings-card-title">
								{ panel.label }
							</h2>
							{ panel.description ? (
								<p className="ap-settings-card-desc">{ panel.description }</p>
							) : null }
						</div>
					</CardHeader>
					<CardBody>
						<SchemaForm
							panel={ panel }
							values={ values }
							onFieldChange={ onFieldChange }
							fieldTypes={ FIELD_TYPES }
						/>
					</CardBody>
				</Card>
			) ) }

			{ /* Non-schema surfaces the section asked for (settings/ia.js `extras`).
			     Business hours live in General → Business (§1.3) so the skip-wizard
			     path — and the Dashboard "Manage" deep link — can still reach them
			     on the default settings landing (U4-03a). */ }
			{ extras.includes( 'business-hours' ) ? <BusinessHoursPanel /> : null }
			{ extras.includes( 'appearance-hint' ) ? <AppearanceHint /> : null }
			{ extras.includes( 'privacy-launcher' ) ? <PrivacyLauncher /> : null }
			{ extras.includes( 'system-status' ) ? <SystemStatus /> : null }

			<SaveBar
				isDirty={ isDirty }
				isSaving={ saving }
				onSave={ save }
				onReset={ discard }
				resetDisabledWhenNotDirty
				labels={ {
					regionLabel: __( 'Settings actions', 'aponto' ),
					saveLabel: __( 'Save changes', 'aponto' ),
					savingLabel: __( 'Saving…', 'aponto' ),
					resetLabel: __( 'Discard changes', 'aponto' ),
					statusSaved: __( 'No unsaved changes', 'aponto' ),
					statusDirty: __( 'Unsaved changes', 'aponto' ),
					statusSaving: __( 'Saving…', 'aponto' ),
				} }
			/>

			<ConfirmDialog
				isOpen={ !! pendingNav }
				onConfirm={ confirmPendingNav }
				onCancel={ cancelPendingNav }
				confirmButtonText={ __( 'Discard changes', 'aponto' ) }
				cancelButtonText={ __( 'Keep editing', 'aponto' ) }
			>
				{ __( 'You have unsaved settings. Leaving now will discard them.', 'aponto' ) }
			</ConfirmDialog>
			{ dialog }
		</div>
	);
}

/**
 * Build the SchemaForm panels for a section: keep the schema keys (in schema
 * order) whose `panel` the section asked for, group them by panel, attach
 * presentation, and project the current values into the kit's
 * `values[panelId][fieldId]` shape.
 *
 * Panels the tree never names (`theme`, `notifications.*`) simply do not render —
 * their values still round-trip through the full-replacement PUT.
 */
function panelsForSection( schema, panels, currentValue, fieldErrors ) {
	const allowed = Array.isArray( panels ) ? panels : [];
	const order = [];
	const byPanel = {};
	schema
		.filter( ( entry ) => allowed.includes( entry.panel ) )
		.forEach( ( entry ) => {
			if ( ! byPanel[ entry.panel ] ) {
				byPanel[ entry.panel ] = [];
				order.push( entry.panel );
			}
			byPanel[ entry.panel ].push( entry );
		} );

	return order.map( ( panelId ) => {
		const meta = PANEL_META[ panelId ] || { label: panelId };
		const fields = byPanel[ panelId ].map( ( entry ) => buildField( entry, fieldErrors, currentValue( entry.key ) ) );
		const values = {
			[ panelId ]: Object.fromEntries(
				byPanel[ panelId ].map( ( entry ) => [ entry.key, currentValue( entry.key ) ] )
			),
		};
		return {
			panel: { id: panelId, label: meta.label, description: meta.description, fields },
			values,
		};
	} );
}

/** Assemble a kit SchemaField descriptor from a schema entry + presentation catalog. */
function buildField( entry, fieldErrors, value ) {
	const meta = FIELD_META[ entry.key ] || {};
	const control = meta.control || controlForType( entry.type );
	const err = fieldErrors[ entry.key ];
	let description = meta.help || null;
	if ( err ) {
		description = (
			<>
				{ meta.help ? <span>{ meta.help } </span> : null }
				<span className="ap-field-error">{ err }</span>
			</>
		);
	}
	// A stored value outside a select's menu (e.g. an exotic ISO currency set via REST) stays
	// selectable: merge it in front so the select never silently shows the wrong choice (U2 FB6).
	let options = meta.options;
	if ( control === 'select' && Array.isArray( options ) && value !== undefined && value !== null && value !== '' ) {
		const current = String( value );
		if ( ! options.some( ( option ) => String( option.value ) === current ) ) {
			options = [ { value: current, label: current }, ...options ];
		}
	}
	return {
		id: entry.key,
		type: control,
		label: meta.label || entry.key,
		description,
		options,
		units: meta.units,
		min: meta.min,
		max: meta.max,
		maxLength: meta.maxLength,
	};
}

/**
 * General-tab discovery card (C9 — finding U1 Maria): the booking form's accent color and corner
 * radius moved to the block Inspector (Q11), which the salon owner couldn't find. Point at it, and
 * deep-link to the booking page's editor when one exists (`config.bookingPage.editUrl`).
 */
function AppearanceHint() {
	const page = config.bookingPage;
	return (
		<Card className="ap-settings-card">
			<CardHeader>
				<div>
					<h2 className="ap-settings-card-title">{ __( 'Booking form appearance', 'aponto' ) }</h2>
					<p className="ap-settings-card-desc">
						{ __( 'The accent color and corner radius are part of the booking form block.', 'aponto' ) }
					</p>
				</div>
			</CardHeader>
			<CardBody>
				<p className="ap-hint-steps">
					{ __(
						'To change them: open the page that holds your booking form, select the Aponto booking form block, then adjust the color and rounding in the block settings (Inspector) on the right.',
						'aponto'
					) }
				</p>
				{ page && page.editUrl ? (
					<div className="ap-settings-actions-row">
						<Button variant="secondary" href={ page.editUrl }>
							{ __( 'Edit booking page', 'aponto' ) }
						</Button>
					</div>
				) : null }
			</CardBody>
		</Card>
	);
}

/** Privacy tab launcher: deep-links to WordPress's built-in export/erase tools (§5). */
function PrivacyLauncher() {
	const tools = config.privacyTools || {};
	if ( ! tools.export && ! tools.erase ) {
		return null;
	}
	return (
		<Card className="ap-settings-card">
			<CardHeader>
				<div>
					<h2 className="ap-settings-card-title">{ __( 'Data access requests', 'aponto' ) }</h2>
					<p className="ap-settings-card-desc">
						{ __(
							'Handle GDPR export and erasure requests with WordPress’s built-in privacy tools — Aponto data is included automatically.',
							'aponto'
						) }
					</p>
				</div>
			</CardHeader>
			<CardBody>
				<div className="ap-settings-actions-row">
					{ tools.export ? (
						<Button variant="secondary" href={ tools.export }>
							{ __( 'Export personal data', 'aponto' ) }
						</Button>
					) : null }
					{ tools.erase ? (
						<Button variant="secondary" href={ tools.erase }>
							{ __( 'Erase personal data', 'aponto' ) }
						</Button>
					) : null }
				</div>
			</CardBody>
		</Card>
	);
}

/** Advanced tab read-only system diagnostics (rest-contract §2.15). */
function SystemStatus() {
	const [ data, setData ] = useState( null );
	const [ err, setErr ] = useState( '' );

	useEffect( () => {
		let alive = true;
		api
			.get( '/system/diagnostics' )
			.then( ( res ) => alive && setData( res ) )
			.catch( ( e ) => alive && setErr( e.message || __( 'Could not load diagnostics.', 'aponto' ) ) );
		return () => {
			alive = false;
		};
	}, [] );

	const rows = [];
	if ( data ) {
		const push = ( label, value ) => value !== undefined && value !== null && rows.push( [ label, String( value ) ] );
		push( __( 'Plugin version', 'aponto' ), data.plugin?.version );
		push( __( 'Edition', 'aponto' ), data.plugin?.edition );
		push( __( 'WordPress', 'aponto' ), data.wordpress?.version );
		push( __( 'PHP', 'aponto' ), data.runtime?.php );
		push( __( 'Database', 'aponto' ), data.runtime?.database );
		push( __( 'Schema version', 'aponto' ), data.schema?.version );
		push( __( 'Tables OK', 'aponto' ), data.schema?.tables_ok ? __( 'Yes', 'aponto' ) : __( 'No', 'aponto' ) );
		push( __( 'Timezone', 'aponto' ), data.settings?.timezone );
		if ( data.counts ) {
			push( __( 'Services', 'aponto' ), data.counts.services );
			push( __( 'Staff', 'aponto' ), data.counts.staff );
			push( __( 'Bookings', 'aponto' ), data.counts.bookings );
		}
	}

	return (
		<Card className="ap-settings-card">
			<CardHeader>
				<div>
					<h2 className="ap-settings-card-title">{ __( 'System status', 'aponto' ) }</h2>
					<p className="ap-settings-card-desc">
						{ __( 'A read-only snapshot for support. No personal data is included.', 'aponto' ) }
					</p>
				</div>
			</CardHeader>
			<CardBody>
				{ err ? (
					<Notice status="warning" isDismissible={ false }>
						{ err }
					</Notice>
				) : ! data ? (
					<Spinner />
				) : (
					<>
						<dl className="ap-diagnostics">
							{ rows.map( ( [ label, value ] ) => (
								<div key={ label }>
									<dt>{ label }</dt>
									<dd>{ value }</dd>
								</div>
							) ) }
						</dl>
						{ Array.isArray( data.checks ) && data.checks.length ? (
							<ul className="ap-diagnostics-checks">
								{ data.checks.map( ( check ) => (
									<li key={ check.code } data-status={ check.status }>
										<strong>{ check.code }</strong>
										<span>{ check.status }</span>
									</li>
								) ) }
							</ul>
						) : null }
					</>
				) }
			</CardBody>
		</Card>
	);
}

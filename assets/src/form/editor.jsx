/**
 * Block editor script for `aponto/booking-form`.
 *
 * The block is server-rendered on the front end (a dynamic block whose PHP
 * `render_callback` emits the `[data-aponto-form]` host and enqueues the view
 * bundle), so `save` returns null. For the EDITOR preview we mount the *real*
 * Preact widget into an open ShadowRoot on a host element — the exact same
 * `mountWidget` path the front end uses. This is the pattern the shadow-dom spike
 * validated (criterion 5): a live preview that reflects the block's appearance
 * attributes, not a static server snapshot.
 *
 * Why bundle the Preact widget here instead of ServerSideRender: acceptance #13
 * requires the editor preview to REFLECT accent/radius live. ServerSideRender
 * returns static server HTML that cannot host a live token change, and it would
 * not run the view script inside the editor. A direct client mount reuses the
 * frontend code path and updates instantly via CSS variables. The editor bundle
 * is a SEPARATE script from the admin dashboard bundle, so the ~Preact payload
 * loads only in the block editor and never bloats the admin app.
 *
 * This module renders through `@wordpress/element` (React) — the JSX here has no
 * `@jsxImportSource preact` pragma, so it compiles to `wp.element`, an external.
 * The mounted widget is Preact, bundled. Two renderers, one bundle, by design.
 */
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ColorPalette,
	BaseControl,
} from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { mountWidget } from './mount.jsx';
import {
	resolveAppearanceVars,
	resolveColorScheme,
} from './lib/appearance.js';
import metadata from './block.json';

/** A small brand-neutral accent palette for the picker (custom colors allowed). */
const ACCENT_SWATCHES = [
	{ name: 'Indigo', color: '#5b5bd6' },
	{ name: 'Blue', color: '#2563eb' },
	{ name: 'Emerald', color: '#0f9d6b' },
	{ name: 'Rose', color: '#e11d48' },
	{ name: 'Amber', color: '#d97706' },
	{ name: 'Slate', color: '#334155' },
];

/** Build the widget `appearance` object from block attributes. */
function appearanceFrom( attributes ) {
	const appearance = {};
	if ( attributes.accent ) {
		appearance.accent = attributes.accent;
	}
	if (
		attributes.radius !== undefined &&
		attributes.radius !== null &&
		attributes.radius !== ''
	) {
		appearance.radius = attributes.radius;
	}
	if ( attributes.colorScheme ) {
		appearance.colorScheme = attributes.colorScheme;
	}
	return appearance;
}

/** Build the host `data-props` payload from block attributes. */
function propsFrom( attributes ) {
	return {
		serviceId: attributes.serviceId ?? null,
		staffId: attributes.staffId ?? null,
		layout: attributes.layout || 'default',
		appearance: appearanceFrom( attributes ),
	};
}

/** Apply appearance CSS variables to the host element (live, no remount). */
function applyAppearance( host, attributes ) {
	if ( ! host ) {
		return;
	}
	const appearance = appearanceFrom( attributes );
	const vars = resolveAppearanceVars( appearance );
	// Clear every property we manage so removing an attribute — or moving to an
	// accent that no longer needs an override, as the dark-stroke checkbox glyph
	// does — reverts to the shadow default, then set whatever is present.
	[
		'--ap-color-accent',
		'--ap-color-on-accent',
		'--ap-radius-control',
		'--ap-checkbox-check-image',
	].forEach( ( name ) => host.style.removeProperty( name ) );
	Object.keys( vars ).forEach( ( name ) =>
		host.style.setProperty( name, vars[ name ] )
	);
	// Scheme is a host ATTRIBUTE, not a custom property — the shadow stylesheet
	// selects its dark preset with `:host([data-ap-color-scheme="dark"])`, so this
	// repaints live without remounting the widget.
	host.setAttribute(
		'data-ap-color-scheme',
		resolveColorScheme( appearance )
	);
}

/** Inspector control: pick a service to preselect (or let the visitor choose). */
function ServicePicker( { value, onChange } ) {
	const [ services, setServices ] = useState( null );

	useEffect( () => {
		const cfg = ( typeof window !== 'undefined' && window.apontoForm ) || {};
		const base = String( cfg.restUrl || '' ).replace( /\/+$/, '' );
		if ( ! base ) {
			setServices( [] );
			return;
		}
		const headers = { Accept: 'application/json' };
		if ( cfg.nonce ) {
			headers[ 'X-WP-Nonce' ] = cfg.nonce;
		}
		fetch( base + '/public/services', {
			headers,
			credentials: 'same-origin',
		} )
			.then( ( r ) => ( r.ok ? r.json() : null ) )
			.then( ( d ) => setServices( d && d.items ? d.items : [] ) )
			.catch( () => setServices( [] ) );
	}, [] );

	const options = [
		{ label: __( 'All services (visitor chooses)', 'aponto' ), value: '' },
	];
	( services || [] ).forEach( ( s ) =>
		options.push( { label: s.name, value: String( s.id ) } )
	);

	return (
		<SelectControl
			__next40pxDefaultSize
			label={ __( 'Preselected service', 'aponto' ) }
			value={ value ? String( value ) : '' }
			options={ options }
			help={
				services === null
					? __( 'Loading services…', 'aponto' )
					: __(
							'Skip the service step by preselecting one service.',
							'aponto'
					  )
			}
			onChange={ ( v ) =>
				onChange( v ? parseInt( v, 10 ) : undefined )
			}
			__nextHasNoMarginBottom
		/>
	);
}

/**
 * Preselect a staff member (D-R28). Renders ONLY once the account has more than one active staff
 * member: with a single member the choice is already made, and an inspector control whose one
 * option is the only possible answer is noise.
 *
 * Reads the ADMIN `GET /staff` route, not a public one — this component exists solely inside the
 * block editor, which runs in wp-admin behind the `wp_rest` nonce
 * ({@see \Aponto\Frontend\BlockRegistrar::config()}). An editor without `aponto_manage_staff` gets
 * a 403, which lands in the same `[]` state as "no staff": the control simply does not appear, and
 * the block keeps whatever `staffId` it already carries. Nothing here reaches the PUBLIC form
 * bundle — this module is the separate `form-editor` entry, outside the form budget.
 *
 * @param {{value: ?number, onChange: Function}} props Control props.
 */
function StaffPicker( { value, onChange } ) {
	const [ staff, setStaff ] = useState( null );

	useEffect( () => {
		const cfg = ( typeof window !== 'undefined' && window.apontoForm ) || {};
		const base = String( cfg.restUrl || '' ).replace( /\/+$/, '' );
		if ( ! base ) {
			setStaff( [] );
			return;
		}
		const headers = { Accept: 'application/json' };
		if ( cfg.nonce ) {
			headers[ 'X-WP-Nonce' ] = cfg.nonce;
		}
		fetch( base + '/staff?status=active&per_page=100', {
			headers,
			credentials: 'same-origin',
		} )
			.then( ( r ) => ( r.ok ? r.json() : null ) )
			.then( ( d ) => setStaff( d && d.items ? d.items : [] ) )
			.catch( () => setStaff( [] ) );
	}, [] );

	if ( ! staff || staff.length < 2 ) {
		return null;
	}

	const options = [
		{ label: __( 'Any staff (visitor chooses)', 'aponto' ), value: '' },
	];
	staff.forEach( ( s ) =>
		options.push( { label: s.name, value: String( s.id ) } )
	);

	return (
		<SelectControl
			__next40pxDefaultSize
			label={ __( 'Preselected staff', 'aponto' ) }
			value={ value ? String( value ) : '' }
			options={ options }
			help={ __(
				'Skip the staff step by preselecting one team member.',
				'aponto'
			) }
			onChange={ ( v ) => onChange( v ? parseInt( v, 10 ) : undefined ) }
			__nextHasNoMarginBottom
		/>
	);
}

registerBlockType( metadata, {
	edit: function Edit( { attributes, setAttributes } ) {
		const { serviceId, staffId, layout, accent, radius, colorScheme } =
			attributes;
		const hostRef = useRef( null );
		const blockProps = useBlockProps( {
			className: 'aponto-booking-form-editor',
		} );

		// A key that captures everything that requires a fresh mount (a shadow
		// root can only be attached once). Appearance is NOT included — accent and
		// radius update live via CSS variables below.
		const mountKey = [ serviceId || '', staffId || '', layout || 'default' ].join(
			':'
		);

		// Mount the real widget whenever the mount key changes. React recreates the
		// host div (keyed by mountKey), so `__apMounted` is fresh and mountWidget
		// attaches a new shadow root; the previous DOM node (and its shadow) is
		// discarded with it.
		useEffect( () => {
			const host = hostRef.current;
			if ( ! host || host.__apMounted ) {
				return;
			}
			host.setAttribute(
				'data-props',
				JSON.stringify( propsFrom( attributes ) )
			);
			applyAppearance( host, attributes );
			mountWidget( host );
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [ mountKey ] );

		// Live appearance: recompute CSS variables on the host without remounting.
		useEffect( () => {
			applyAppearance( hostRef.current, attributes );
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [ accent, radius, colorScheme ] );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Booking', 'aponto' ) }>
						<ServicePicker
							value={ serviceId }
							onChange={ ( v ) =>
								setAttributes( { serviceId: v } )
							}
						/>
						<StaffPicker
							value={ staffId }
							onChange={ ( v ) =>
								setAttributes( { staffId: v } )
							}
						/>
					</PanelBody>
					<PanelBody
						title={ __( 'Appearance', 'aponto' ) }
						initialOpen={ false }
					>
						<BaseControl
							label={ __( 'Accent color', 'aponto' ) }
							__nextHasNoMarginBottom
						>
							<ColorPalette
								colors={ ACCENT_SWATCHES }
								value={ accent || undefined }
								onChange={ ( color ) =>
									setAttributes( { accent: color || '' } )
								}
								enableAlpha={ false }
								clearable
							/>
						</BaseControl>
						<RangeControl
							__next40pxDefaultSize
							label={ __( 'Corner radius (px)', 'aponto' ) }
							value={
								typeof radius === 'number' ? radius : undefined
							}
							onChange={ ( v ) =>
								setAttributes( {
									radius:
										v === undefined || v === null
											? undefined
											: v,
								} )
							}
							min={ 0 }
							max={ 24 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<SelectControl
							__next40pxDefaultSize
							label={ __( 'Color scheme', 'aponto' ) }
							value={ colorScheme || 'light' }
							options={ [
								{ label: __( 'Light', 'aponto' ), value: 'light' },
								{ label: __( 'Dark', 'aponto' ), value: 'dark' },
							] }
							help={ __(
								'Set here and nowhere else — the form never follows the visitor’s device or your admin theme.',
								'aponto'
							) }
							onChange={ ( v ) =>
								setAttributes( { colorScheme: v || 'light' } )
							}
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<div data-aponto-form key={ mountKey } ref={ hostRef } />
				</div>
			</>
		);
	},
	save: function Save() {
		return null;
	},
} );

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
	ToggleControl,
	TextControl,
	RangeControl,
	ColorPalette,
	BaseControl,
	RadioControl,
	Notice,
} from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import { mountWidget } from './mount.jsx';
import {
	resolveAppearanceVars,
	resolveColorScheme,
	resolveShadow,
	MAX_WIDTH_MIN,
	MAX_WIDTH_MAX,
	MAX_WIDTH_DEFAULT,
} from './lib/appearance.js';
import {
	appearanceFor,
	propsFor,
	mountKeyFor,
	ONE_PAGE,
	serviceNotice,
	serviceToPin,
	onePageVariation,
	hostFromRendered,
	hostRequestFor,
} from './lib/editor-props.js';
import { preselectDateFor, showHostFor } from './lib/config.js';
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

/** Apply appearance CSS variables to the host element (live, no remount). */
function applyAppearance( host, attributes ) {
	if ( ! host ) {
		return;
	}
	const appearance = appearanceFor( attributes );
	const vars = resolveAppearanceVars( appearance );
	// Clear every property we manage so removing an attribute — or moving to an
	// accent that no longer needs an override, as the dark-stroke checkbox glyph
	// does — reverts to the shadow default, then set whatever is present.
	[
		'--ap-color-accent',
		'--ap-color-on-accent',
		'--ap-radius-control',
		'--ap-checkbox-check-image',
		'--ap-layout-max',
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
	host.setAttribute( 'data-ap-shadow', resolveShadow( appearance ) );
}

/**
 * The public service list for the inspector, or null while it loads. Lifted out of the picker
 * so the One page notice (D-R80) reads the same list.
 *
 * @return {?Array} Services.
 */
function usePublicServices() {
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

	return services;
}

/**
 * Placeholder for the meeting-method "Details" field (D-R82): an example of what the visitor
 * should read under that type.
 *
 * @param {string} type Meeting type.
 * @return {string} Placeholder.
 */
function meetingPlaceholder( type ) {
	switch ( type ) {
		case 'in_person':
			return __( 'Our studio, 2nd floor', 'aponto' );
		case 'phone':
			return __( 'We call the number you give us', 'aponto' );
		case 'online':
			return __( 'Link sent after booking', 'aponto' );
		default:
			return __( 'e.g. Meet us at the front desk', 'aponto' );
	}
}

/**
 * The host line the SERVER would render for this block (D-R85), for the editor preview.
 *
 * The host is resolved by `Frontend\HostLine` at render time and lives only in the block's
 * `data-props`, so the preview — a client-only mount — asks core's block renderer
 * (`/wp/v2/block-renderer/aponto/booking-form`, `context=edit`, which requires `edit_posts`) for
 * THIS block's render and keeps only `host`: same resolver, same gates, no new route. Debounced,
 * refetched when the service, staff, location, layout or "Show host" change, stale requests
 * aborted, and cleared AT ONCE on every change and on any failure — never a stale host.
 *
 * @param {Object} attributes Block attributes.
 * @return {?Object} Raw host payload, or null.
 */
function useServerHost( attributes ) {
	const request = hostRequestFor( attributes );
	const key = request ? JSON.stringify( request ) : '';
	const [ host, setHost ] = useState( null );

	useEffect( () => {
		setHost( null );
		if ( ! request ) {
			return;
		}
		const controller =
			typeof AbortController === 'undefined' ? null : new AbortController();
		const timer = setTimeout( () => {
			apiFetch( {
				path: '/wp/v2/block-renderer/aponto/booking-form?context=edit',
				method: 'POST',
				data: { attributes: request },
				signal: controller ? controller.signal : undefined,
			} ).then(
				( res ) => setHost( hostFromRendered( res && res.rendered ) ),
				() => setHost( null )
			);
		}, 300 );
		return () => {
			clearTimeout( timer );
			if ( controller ) {
				controller.abort();
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key ] );

	return request ? host : null;
}

/**
 * The admin name of a service the public list no longer carries (QA N3), through the EXISTING
 * admin `GET /services/{id}` (capability `aponto_manage_services`, editor nonce) — '' when there
 * is nothing to read, it is deleted, or this user may not read it.
 *
 * @param {number} id Service id, 0 for none.
 * @return {string} Name or ''.
 */
function useStaleServiceName( id ) {
	const [ name, setName ] = useState( '' );
	useEffect( () => {
		setName( '' );
		const cfg = ( typeof window !== 'undefined' && window.apontoForm ) || {};
		const base = String( cfg.restUrl || '' ).replace( /\/+$/, '' );
		if ( ! id || ! base ) {
			return;
		}
		let live = true;
		const headers = { Accept: 'application/json' };
		if ( cfg.nonce ) {
			headers[ 'X-WP-Nonce' ] = cfg.nonce;
		}
		fetch( base + '/services/' + Number( id ), {
			headers,
			credentials: 'same-origin',
		} )
			.then( ( r ) => ( r.ok ? r.json() : null ) )
			.then( ( d ) => {
				if ( live && d && typeof d.name === 'string' ) {
					setName( d.name );
				}
			} )
			.catch( () => {} );
		return () => {
			live = false;
		};
	}, [ id ] );
	return name;
}

/**
 * Whether this site can show a Staff screen at all (QA N4): the page-global `staff` block is
 * published only with Premium `multi_staff`, and the Staff step shows only when visitors choose
 * (`visitor`/`required`, as `PublicServicesController` decides).
 *
 * @return {boolean} A Staff step can render.
 */
function staffChoiceOffered() {
	const cfg = ( typeof window !== 'undefined' && window.apontoForm ) || {};
	return !! cfg.staff && [ 'visitor', 'required' ].includes( cfg.staff.choice );
}

/** Inspector control: pick a service to preselect (or let the visitor choose). */
function ServicePicker( { services, value, onChange, onePage = false } ) {
	const options = [
		{ label: __( 'All services (visitor chooses)', 'aponto' ), value: '' },
	];
	( services || [] ).forEach( ( s ) =>
		options.push( { label: s.name, value: String( s.id ) } )
	);
	// A pinned service the list no longer carries stays VISIBLE as what it is (QA D01): falling
	// back to "All services" hid what had happened to the block. Named when the editor user can
	// read it through the existing admin `GET /services/{id}` (QA N3, `aponto_manage_services`);
	// the id form otherwise (deleted, or no capability).
	const missing =
		value &&
		Array.isArray( services ) &&
		! services.some( ( s ) => Number( s.id ) === Number( value ) );
	const staleName = useStaleServiceName( missing ? value : 0 );
	if ( missing ) {
		options.push( {
			label: staleName
				? /* translators: %s: the name of a service that is no longer active. */
				  sprintf( __( '%s (unavailable)', 'aponto' ), staleName )
				: /* translators: %d: the id of a service that is no longer active. */
				  sprintf( __( 'Unavailable service (#%d)', 'aponto' ), value ),
			value: String( value ),
		} );
	}

	return (
		<SelectControl
			__next40pxDefaultSize
			label={ __( 'Preselected service', 'aponto' ) }
			value={ value ? String( value ) : '' }
			options={ options }
			help={
				services === null
					? __( 'Loading services…', 'aponto' )
					: onePage
					? __( 'The one service this page books.', 'aponto' )
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
function StaffPicker( { value, onChange, onePage = false } ) {
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
			help={
				onePage
					? __( 'Pin the person this page books with.', 'aponto' )
					: __(
							'Skip the staff step by preselecting one team member.',
							'aponto'
					  )
			}
			onChange={ ( v ) => onChange( v ? parseInt( v, 10 ) : undefined ) }
			__nextHasNoMarginBottom
		/>
	);
}

/**
 * Preselect a location (D-R62). Mirrors {@link StaffPicker} exactly, signal included: it renders
 * ONLY once the site has more than one ACTIVE location, and that is also how it stays out of the
 * way where the module is unavailable — a Free site has no location rows (AGENTS §5 invariant
 * 11), and one location is a fact rather than a choice, so the control would be noise.
 *
 * Reads the core read-only ADMIN `GET /locations` route (rest-contract §2.17, capability
 * `aponto_manage_settings`) behind the editor's `wp_rest` nonce. An editor without that
 * capability gets a 403, which lands in the same `[]` state as "no locations": the control does
 * not appear and the block keeps whatever `locationId` it already carries. This module is the
 * separate `form-editor` entry, outside the public form budget.
 *
 * @param {{value: ?number, onChange: Function}} props Control props.
 */
function LocationPicker( { value, onChange } ) {
	const [ locations, setLocations ] = useState( null );

	useEffect( () => {
		const cfg = ( typeof window !== 'undefined' && window.apontoForm ) || {};
		const base = String( cfg.restUrl || '' ).replace( /\/+$/, '' );
		if ( ! base ) {
			setLocations( [] );
			return;
		}
		const headers = { Accept: 'application/json' };
		if ( cfg.nonce ) {
			headers[ 'X-WP-Nonce' ] = cfg.nonce;
		}
		fetch( base + '/locations?status=active&per_page=100', {
			headers,
			credentials: 'same-origin',
		} )
			.then( ( r ) => ( r.ok ? r.json() : null ) )
			.then( ( d ) => setLocations( d && d.items ? d.items : [] ) )
			.catch( () => setLocations( [] ) );
	}, [] );

	if ( ! locations || locations.length < 2 ) {
		return null;
	}

	// No "Any location" wording: the public form has no such row (D-R60 rule 3) — the empty
	// value means the VISITOR picks, not that the system assigns one.
	const options = [
		{ label: __( 'None (visitor chooses)', 'aponto' ), value: '' },
	];
	locations.forEach( ( l ) =>
		options.push( { label: l.name, value: String( l.id ) } )
	);

	return (
		<SelectControl
			__next40pxDefaultSize
			label={ __( 'Preselected location', 'aponto' ) }
			value={ value ? String( value ) : '' }
			options={ options }
			help={ __(
				'Skip the location step by preselecting one location.',
				'aponto'
			) }
			onChange={ ( v ) => onChange( v ? parseInt( v, 10 ) : undefined ) }
			__nextHasNoMarginBottom
		/>
	);
}

/**
 * The Aponto logo SYMBOL (not the wordmark) as the block icon (founder 2026-10-04) — the same
 * shape as the admin menu icon (`Admin\AdminPage`, 208-unit viewBox): a disk with the triangle
 * and the ring cut out. Single colour through `currentColor`, so it follows the editor's own icon
 * colouring in the inserter, toolbar, List View and inspector. Both the block and the one-page
 * variation use it; their titles tell them apart. `block.json` keeps a Dashicon as the
 * server-side fallback.
 */
const APONTO_SYMBOL = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 208 208"
		width="24"
		height="24"
		aria-hidden="true"
		focusable="false"
	>
		<defs>
			<mask id="aponto-block-symbol">
				<rect width="208" height="208" fill="#fff" />
				<path
					d="M85.8135 55.2393C93.8964 41.2393 114.104 41.2393 122.187 55.2393L161.685 123.652C169.768 137.652 159.664 155.152 143.498 155.152H64.5018C48.336 155.152 38.2323 137.652 46.3152 123.652L85.8135 55.2393Z"
					fill="#000"
				/>
				<circle cx="144.413" cy="87.8912" r="34.7609" fill="#fff" />
				<circle cx="144.413" cy="87.8912" r="23.7609" fill="#000" />
			</mask>
		</defs>
		<circle
			cx="104"
			cy="104"
			r="104"
			fill="currentColor"
			mask="url(#aponto-block-symbol)"
		/>
	</svg>
);

registerBlockType( metadata, {
	icon: { src: APONTO_SYMBOL },
	// The one-page inserter entry (D-R80); the block's own entry stays the step-by-step form.
	variations: [ { ...onePageVariation(), icon: { src: APONTO_SYMBOL } } ],
	edit: function Edit( { attributes, setAttributes, isSelected } ) {
		const {
			layout,
			preselectDate,
			showHost,
			meetingType,
			meetingText,
			serviceId,
			staffId,
			locationId,
			accent,
			radius,
			colorScheme,
			maxWidth,
			shadow,
			contactHelp,
			contactText,
			summaryMode,
			staffLayout,
			stepDisplay,
		} = attributes;
		const hostRef = useRef( null );
		const services = usePublicServices();
		const notice = serviceNotice( attributes, services );
		// Two controls mean nothing in the one-page frame, which has no summary sidebar and no
		// progress display (D-R80). Hidden there rather than left as dead switches — the same
		// convention as the staff and location pickers, which render nothing where they cannot
		// apply. Their saved values are kept for a switch back to Step by step.
		const onePage = ONE_PAGE === layout;
		const blockProps = useBlockProps( {
			className: 'aponto-booking-form-editor',
		} );

		// The INSERTER preview (the variation's `example`) has no service to pin, and a one-page
		// block without one falls back to the step-by-step form — so the preview, and only the
		// preview, borrows the site's first service. Nothing is saved: these attributes feed the
		// preview mount alone (D-R80, founder 2026-10-03).
		const isPreview = useSelect(
			( select ) =>
				!! select( 'core/block-editor' ).getSettings()
					.__unstableIsPreviewMode,
			[]
		);
		const shown =
			isPreview && onePage && ! serviceId && services && services.length
				? { ...attributes, serviceId: services[ 0 ].id }
				: attributes;

		// QA D13 (2026-10-05): a one-page block INSERTED on a single-service site (the variation, or
		// a new block switched to One page) is pinned to that service, so a second service added
		// later cannot turn the page into the step-by-step form. "Inserted" = selected when it
		// mounted — blocks loaded with a saved post are not, and keep today's behaviour.
		const insertedRef = useRef( isSelected );
		useEffect( () => {
			if ( ! insertedRef.current ) {
				return;
			}
			const pin = serviceToPin( attributes, services );
			if ( pin ) {
				insertedRef.current = false;
				setAttributes( { serviceId: pin } );
			} else if ( Array.isArray( services ) ) {
				insertedRef.current = false;
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [ services ] );

		// The server-resolved host line (D-R85), so the preview shows what the page will.
		const serverHost = useServerHost( attributes );

		// Everything that needs a fresh mount, computed in one testable place
		// ({@see mountKeyFor}) — a shadow root can only be attached once, so the
		// host element is rebuilt whenever this string changes. The host rides it too.
		const mountKey =
			mountKeyFor( shown ) +
			( serverHost ? ':host:' + JSON.stringify( serverHost ) : '' );

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
				JSON.stringify(
					serverHost
						? { ...propsFor( shown ), host: serverHost }
						: propsFor( shown )
				)
			);
			applyAppearance( host, attributes );
			mountWidget( host );
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [ mountKey ] );

		// Live appearance: recompute CSS variables on the host without remounting.
		useEffect( () => {
			applyAppearance( hostRef.current, attributes );
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [ accent, radius, colorScheme, maxWidth, shadow ] );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Booking', 'aponto' ) }>
						{ /* Booking flow (D-R80). The preview remounts on `layout` through the
						     mount key, so flipping it shows the other frame at once. */ }
						<RadioControl
							label={ __( 'Booking flow', 'aponto' ) }
							selected={ ONE_PAGE === layout ? ONE_PAGE : 'default' }
							options={ [
								{
									label: __( 'Step by step', 'aponto' ),
									value: 'default',
								},
								{ label: __( 'One page', 'aponto' ), value: ONE_PAGE },
							] }
							help={
								ONE_PAGE === layout
									? __(
											'One page books a single service. When the site has only one, it is preselected for you so the page stays the same if you add more later.',
											'aponto'
									  )
									: undefined
							}
							onChange={ ( v ) => {
								const next = {
									layout: ONE_PAGE === v ? ONE_PAGE : 'default',
								};
								// QA D13: pin the lone service the moment the flow is chosen.
								const pin = serviceToPin(
									{ ...attributes, ...next },
									services
								);
								setAttributes( pin ? { ...next, serviceId: pin } : next );
							} }
						/>
						{ 'choose' === notice && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'Choose a service for the One page flow. Without one, visitors see the step-by-step form.',
									'aponto'
								) }
							</Notice>
						) }
						{ 'missing' === notice && (
							<Notice status="warning" isDismissible={ false }>
								{ onePage
									? __(
											'The selected service is no longer available, so visitors see “This service is no longer available”. Choose another service.',
											'aponto'
									  )
									: __(
											'The selected service is no longer available, so visitors choose from all services. Choose another service.',
											'aponto'
									  ) }
							</Notice>
						) }
						{ /* The host / team line (D-R85): one page only. Who appears is resolved by the
						     server from the staff profiles at render time; the preview here cannot
						     show it. */ }
						{ onePage && (
							<ToggleControl
								label={ __( 'Show host', 'aponto' ) }
								help={ __(
									'Shows who the visitor will meet: name, photo and job title from the staff profile.',
									'aponto'
								) }
								checked={ showHostFor( showHost, layout ) }
								onChange={ ( v ) => setAttributes( { showHost: !! v } ) }
								__nextHasNoMarginBottom
							/>
						) }
						{ /* The meeting-method line (D-R82): block-level, one-page only. Values are
						     kept when switching back to Step by step, where they do nothing. */ }
						{ onePage && (
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Meeting method', 'aponto' ) }
								value={ meetingType || '' }
								options={ [
									{ label: __( 'None', 'aponto' ), value: '' },
									{ label: __( 'In person', 'aponto' ), value: 'in_person' },
									{ label: __( 'Phone call', 'aponto' ), value: 'phone' },
									{ label: __( 'Online meeting', 'aponto' ), value: 'online' },
									{ label: __( 'Custom text', 'aponto' ), value: 'custom' },
								] }
								onChange={ ( v ) => setAttributes( { meetingType: v || '' } ) }
								__nextHasNoMarginBottom
							/>
						) }
						{ onePage && meetingType && (
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Details', 'aponto' ) }
								help={ __(
									'Shown to visitors on the form. Anything typed here is public.',
									'aponto'
								) }
								placeholder={ meetingPlaceholder( meetingType ) }
								value={ meetingText || '' }
								maxLength={ 140 }
								onChange={ ( v ) => setAttributes( { meetingText: v } ) }
								__nextHasNoMarginBottom
							/>
						) }
						<ServicePicker
							services={ services }
							onePage={ onePage }
							value={ serviceId }
							onChange={ ( v ) =>
								setAttributes( { serviceId: v } )
							}
						/>
						<StaffPicker
							onePage={ onePage }
							value={ staffId }
							onChange={ ( v ) =>
								setAttributes( { staffId: v } )
							}
						/>
						<LocationPicker
							value={ locationId }
							onChange={ ( v ) =>
								setAttributes( { locationId: v } )
							}
						/>
						{ /* D-R84: shown in both flows; unset reads as the current flow's default
						     (on for step by step, off for one page), so switching the flow with
						     the attribute unset moves the toggle with it. */ }
						<ToggleControl
							label={ __( 'Preselect the first available day', 'aponto' ) }
							help={ __(
								'Opens the calendar with the first open day and its times already showing.',
								'aponto'
							) }
							checked={ preselectDateFor( preselectDate, layout ) }
							onChange={ ( v ) => setAttributes( { preselectDate: !! v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody
						title={ __( 'Layout', 'aponto' ) }
						initialOpen={ false }
					>
						<RangeControl
							__next40pxDefaultSize
							label={ __( 'Maximum width (px)', 'aponto' ) }
							value={
								typeof maxWidth === 'number'
									? maxWidth
									: undefined
							}
							onChange={ ( v ) =>
								setAttributes( {
									maxWidth:
										v === undefined || v === null
											? undefined
											: v,
								} )
							}
							min={ MAX_WIDTH_MIN }
							max={ MAX_WIDTH_MAX }
							step={ 10 }
							initialPosition={ MAX_WIDTH_DEFAULT }
							allowReset
							help={ __(
								'The form never grows wider than this. Default 960.',
								'aponto'
							) }
							__nextHasNoMarginBottom
						/>
						{ ! onePage && (
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Booking summary', 'aponto' ) }
								value={ summaryMode || 'always' }
								options={ [
									{
										label: __(
											'Always visible (default)',
											'aponto'
										),
										value: 'always',
									},
									{
										label: __(
											'From the second step',
											'aponto'
										),
										value: 'step2',
									},
									{
										label: __(
											'Hidden (compact recap only)',
											'aponto'
										),
										value: 'off',
									},
								] }
								help={ __(
									'On narrow containers the summary collapses into a recap bar.',
									'aponto'
								) }
								onChange={ ( v ) =>
									setAttributes( { summaryMode: v || 'always' } )
								}
								__nextHasNoMarginBottom
							/>
						) }
						{ /* The ONE per-block staff setting (D-R52). Photos, job titles and
						     profiles are disclosure decisions a business answers once, so they
						     stay site-wide in Settings; the layout is the one a landing page
						     might legitimately want different from the rest of the site. */ }
						{ /* Only where a Staff screen can render (QA N4): the site publishes a
						     staff roster (`apontoForm.staff` exists only with `multi_staff`) and
						     the block pins nobody. Otherwise it has no effect, in either flow. */ }
						{ ! staffId && staffChoiceOffered() && (
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Staff layout', 'aponto' ) }
								value={ staffLayout || '' }
								options={ [
									{
										label: __(
											'Use site setting',
											'aponto'
										),
										value: '',
									},
									{ label: __( 'List', 'aponto' ), value: 'list' },
									{
										label: __( 'Cards', 'aponto' ),
										value: 'cards',
									},
								] }
								help={ __(
									'Applies when visitors choose a staff member. Cards fall back to the list automatically on narrow forms.',
									'aponto'
								) }
								onChange={ ( v ) =>
									setAttributes( { staffLayout: v || '' } )
								}
								__nextHasNoMarginBottom
							/>
						) }
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
						{ /* Appearance, because the block already owns the form's skin — and per
						     block, because one landing page may want the macro rail while the
						     rest of the site keeps the quiet fraction (D-R53). */ }
						{ ! onePage && (
							<SelectControl
								__next40pxDefaultSize
								label={ __( 'Step display', 'aponto' ) }
								value={ stepDisplay || 'horizontal' }
								options={ [
									{
										label: __( 'Fraction (01 / 05)', 'aponto' ),
										value: 'fraction',
									},
									{
										label: __( 'Progress bar', 'aponto' ),
										value: 'horizontal',
									},
								] }
								help={ __(
									'The progress bar names every step this booking has. On narrow forms it keeps the numbers and drops the labels.',
									'aponto'
								) }
								onChange={ ( v ) =>
									setAttributes( {
										stepDisplay: v || 'horizontal',
									} )
								}
								__nextHasNoMarginBottom
							/>
						) }
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
						<SelectControl
							__next40pxDefaultSize
							label={ __( 'Card shadow', 'aponto' ) }
							value={ shadow || 'sm' }
							options={ [
								{ label: __( 'Flat (border, no shadow)', 'aponto' ), value: 'flat' },
								{ label: __( 'Small', 'aponto' ), value: 'sm' },
								{ label: __( 'Medium', 'aponto' ), value: 'md' },
								{ label: __( 'Large', 'aponto' ), value: 'lg' },
							] }
							onChange={ ( v ) => setAttributes( { shadow: v || 'sm' } ) }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Show contact help', 'aponto' ) }
							help={
								onePage
									? __(
											'“Questions? Call …” at the foot of the intro panel, using the chosen location’s phone or your business phone (Settings → Business). Hidden when neither is set.',
											'aponto'
									  )
									: __(
											'“Questions? Call …” at the foot of the summary, using the chosen location’s phone or your business phone (Settings → Business). Hidden when neither is set.',
											'aponto'
									  )
							}
							checked={ false !== contactHelp }
							onChange={ ( v ) => setAttributes( { contactHelp: !! v } ) }
							__nextHasNoMarginBottom
						/>
						{ false !== contactHelp && (
							<TextControl
								__next40pxDefaultSize
								label={ __( 'Contact help heading', 'aponto' ) }
								placeholder={ __( 'Questions?', 'aponto' ) }
								value={ contactText || '' }
								maxLength={ 80 }
								onChange={ ( v ) => setAttributes( { contactText: v } ) }
								__nextHasNoMarginBottom
							/>
						) }
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

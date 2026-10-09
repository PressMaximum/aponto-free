/**
 * Reusable multiple selector for bounded local catalogs and REST-backed catalogs.
 *
 * The caller owns the selected values and the selected item snapshots. An empty
 * value is deliberately valid so product surfaces can give it a domain meaning
 * such as "all services". Dynamic loaders run only while the popover is open,
 * are debounced, and cannot let an older response replace a newer search.
 */
import {
	Button,
	Dropdown,
	Spinner,
} from '@wordpress/components';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { ensureMultiSelectPopoverStyles } from './multi-select-popover-styles.js';

ensureMultiSelectPopoverStyles();

let nextId = 0;

const defaultItemValue = ( item ) => item?.id ?? item?.value;
const defaultItemLabel = ( item ) => String( item?.label ?? item?.name ?? '' );
const defaultItemDescription = ( item ) =>
	String( item?.description ?? item?.meta ?? '' );
const itemKey = ( value ) => String( value ?? '' );

function mergeItems( localItems, remoteItems, getItemValue ) {
	const merged = new Map();
	[ ...localItems, ...remoteItems ].forEach( ( item ) => {
		const key = itemKey( getItemValue( item ) );
		if ( key ) {
			merged.set( key, item );
		}
	} );

	return Array.from( merged.values() );
}

function matchesQuery( item, query, getItemLabel, getItemDescription ) {
	const needle = query.trim().toLocaleLowerCase();
	if ( ! needle ) {
		return true;
	}

	return `${ getItemLabel( item ) } ${ getItemDescription( item ) }`
		.toLocaleLowerCase()
		.includes( needle );
}

/**
 * Render a click-to-open multiple selector with local and optional remote search.
 *
 * `loadItems` receives `{ search, perPage }` and may return an item array or a
 * REST-style `{ items, meta: { has_more } }` envelope. `onChange` receives both
 * the next value list and all selected item snapshots currently known.
 *
 * Two presentation props for a picker that sits INSIDE a list row (D-R64, the Service editor's
 * "Staff & locations" rows): `hideLabel` keeps `label` as the control's accessible name — the
 * trigger and the option group stay `aria-labelledby` it, so the name still reads "<label>,
 * <current value>" — without painting it as a heading above the trigger; `selectionText` replaces
 * the generic "N items selected" summary when the caller can say it better ("Downtown, Uptown").
 */
export function MultiSelectPopover( {
	label,
	value = [],
	items = [],
	onChange,
	loadItems,
	perPage = 10,
	debounceMs = 250,
	getItemValue = defaultItemValue,
	getItemLabel = defaultItemLabel,
	getItemDescription = defaultItemDescription,
	placeholder,
	searchPlaceholder,
	emptyText,
	loadingText,
	errorText,
	noSelectionText,
	selectionText,
	hideLabel = false,
	help,
	validationMessage,
	disabled = false,
} ) {
	const [ id ] = useState( () => `ap-multiselect-${ ++nextId }` );
	const [ open, setOpen ] = useState( false );
	const [ query, setQuery ] = useState( '' );
	const [ remoteItems, setRemoteItems ] = useState( [] );
	const [ loading, setLoading ] = useState( false );
	const [ loadError, setLoadError ] = useState( false );
	const [ hasMore, setHasMore ] = useState( false );
	const [ retry, setRetry ] = useState( 0 );
	const loaderRef = useRef( loadItems );
	loaderRef.current = loadItems;

	const safeValue = Array.isArray( value ) ? value : [];
	const safeItems = Array.isArray( items ) ? items : [];
	const safeRemoteItems = Array.isArray( remoteItems ) ? remoteItems : [];
	const selectedKeys = useMemo(
		() => new Set( safeValue.map( itemKey ) ),
		[ safeValue ]
	);
	const mergedItems = useMemo(
		() => mergeItems( safeItems, safeRemoteItems, getItemValue ),
		[ safeItems, safeRemoteItems, getItemValue ]
	);
	const visibleItems = useMemo(
		() =>
			mergedItems.filter( ( item ) =>
				matchesQuery( item, query, getItemLabel, getItemDescription )
			),
		[ mergedItems, query, getItemLabel, getItemDescription ]
	);
	const knownByKey = useMemo(
		() =>
			new Map(
				mergedItems.map( ( item ) => [
					itemKey( getItemValue( item ) ),
					item,
				] )
			),
		[ mergedItems, getItemValue ]
	);

	useEffect( () => {
		if ( ! open || typeof loaderRef.current !== 'function' ) {
			return undefined;
		}

		let active = true;
		setLoading( true );
		setLoadError( false );
		const timer = window.setTimeout( async () => {
			try {
				const response = await loaderRef.current( {
					search: query.trim(),
					perPage,
				} );
				if ( ! active ) {
					return;
				}
				const nextItems = Array.isArray( response )
					? response
					: response?.items;
				setRemoteItems( Array.isArray( nextItems ) ? nextItems : [] );
				setHasMore(
					! Array.isArray( response ) && !! response?.meta?.has_more
				);
			} catch {
				if ( active ) {
					setLoadError( true );
				}
			} finally {
				if ( active ) {
					setLoading( false );
				}
			}
		}, debounceMs );

		return () => {
			active = false;
			window.clearTimeout( timer );
		};
	}, [ open, query, perPage, debounceMs, retry ] );

	const updateSelection = ( item, checked ) => {
		const rawValue = getItemValue( item );
		const key = itemKey( rawValue );
		const nextValues = checked
			? [
					...safeValue.filter(
						( current ) => itemKey( current ) !== key
					),
					rawValue,
			  ]
			: safeValue.filter( ( current ) => itemKey( current ) !== key );
		const nextByKey = new Map( knownByKey );
		nextByKey.set( key, item );
		onChange?.(
			nextValues,
			nextValues
				.map( ( current ) => nextByKey.get( itemKey( current ) ) )
				.filter( Boolean )
		);
	};
	// Focus moves to the search field BEFORE the selection empties (D-R63 fix round 1, browser QA
	// B2): Clear used to unmount itself with focus on it, focus fell to <body>, and the Popover's
	// Escape / focus-outside close stopped firing. The button now also stays mounted (disabled
	// when there is nothing to clear), so the toolbar does not shift under the pointer either.
	const searchRef = useRef( null );
	const clear = () => {
		searchRef.current?.focus();
		onChange?.( [], [] );
	};
	const selectionCount = selectedKeys.size;
	const selectedItem =
		selectionCount === 1
			? knownByKey.get( Array.from( selectedKeys )[ 0 ] )
			: null;
	const triggerText =
		selectionCount === 0
			? noSelectionText || placeholder || __( 'Select items', 'aponto' )
			: selectionText
			? selectionText
			: selectionCount === 1 && selectedItem
			? getItemLabel( selectedItem )
			: sprintf(
					_n(
						'%d item selected',
						'%d items selected',
						selectionCount,
						'aponto'
					),
					selectionCount
			  );
	// Escape closes the popover AND returns focus to the trigger (D-R63 fix round 2, a11y): the
	// focused search field unmounts with the popover, and focus used to fall to <body>. Only on
	// Escape — a click elsewhere moves focus where the operator clicked.
	const rootRef = useRef( null );
	const escaped = useRef( false );
	const toggle = ( willOpen ) => {
		setOpen( willOpen );
		if ( ! willOpen ) {
			setQuery( '' );
			setLoadError( false );
			if ( escaped.current ) {
				escaped.current = false;
				rootRef.current?.querySelector( '.ap-multiselect__trigger' )?.focus();
			}
		}
	};

	return (
		<div
			ref={ rootRef }
			className={ `ap-multiselect${
				validationMessage ? ' has-error' : ''
			}` }
		>
			{ hideLabel ? (
				<span className="ap-multiselect__label screen-reader-text" id={ `${ id }-label` }>
					{ label }
				</span>
			) : (
				<label className="ap-multiselect__label" id={ `${ id }-label` }>
					{ label }
				</label>
			) }
			<Dropdown
				className="ap-multiselect__dropdown"
				contentClassName="ap-multiselect-popover"
				open={ open }
				onToggle={ toggle }
				focusOnMount="firstInputElement"
				popoverProps={ { placement: 'bottom-start' } }
				renderToggle={ ( { isOpen, onToggle } ) => (
					<Button
						className="ap-multiselect__trigger"
						variant="secondary"
						disabled={ disabled }
						onClick={ onToggle }
						aria-expanded={ isOpen }
						aria-labelledby={ `${ id }-label ${ id }-value` }
					>
						<span
							id={ `${ id }-value` }
							className={ selectionCount ? '' : 'is-placeholder' }
						>
							{ triggerText }
						</span>
						<svg
							className="ap-multiselect__chevron"
							viewBox="0 0 12 12"
							focusable="false"
							aria-hidden="true"
						>
							<path d="M2.25 4.25 6 8l3.75-3.75" />
						</svg>
					</Button>
				) }
				renderContent={ () => (
					// eslint-disable-next-line jsx-a11y/no-static-element-interactions -- only observes Escape on its way to the Dropdown's own close.
					<div className="ap-multiselect-popover__inner" onKeyDown={ ( event ) => { if ( 'Escape' === event.key ) escaped.current = true; } }>
						<div className="ap-multiselect-popover__header">
							<input
								ref={ searchRef }
								className="ap-multiselect-popover__search"
								type="search"
								value={ query }
								placeholder={
									searchPlaceholder ||
									__( 'Search items…', 'aponto' )
								}
								aria-label={
									searchPlaceholder ||
									__( 'Search items', 'aponto' )
								}
								autoComplete="off"
								onChange={ ( event ) =>
									setQuery( event.target.value )
								}
							/>
							<div className="ap-multiselect-popover__toolbar">
								<span>
									{ selectionCount
										? sprintf(
												_n(
													'%d selected',
													'%d selected',
													selectionCount,
													'aponto'
												),
												selectionCount
										  )
										: placeholder ||
										  __( 'Select items', 'aponto' ) }
								</span>
								<Button variant="link" onClick={ clear } disabled={ ! selectionCount }>
									{ __( 'Clear', 'aponto' ) }
								</Button>
							</div>
						</div>
						<div
							className="ap-multiselect-popover__list"
							role="group"
							aria-labelledby={ `${ id }-label` }
						>
							{ visibleItems.map( ( item ) => {
								const key = itemKey( getItemValue( item ) );
								const selected = selectedKeys.has( key );

								return (
									<label
										className={ `ap-multiselect-popover__item${
											selected ? ' is-selected' : ''
										}` }
										key={ key }
									>
										<input
											type="checkbox"
											checked={ selected }
											onChange={ ( event ) =>
												updateSelection(
													item,
													event.target.checked
												)
											}
										/>
										<span
											className="ap-multiselect-popover__checkbox"
											aria-hidden="true"
										>
											<svg viewBox="0 0 16 16" focusable="false">
												<path d="M3.5 8.5 6.6 11.5 12.7 4.9" />
											</svg>
										</span>
										<span className="ap-multiselect-popover__item-label">
											{ getItemLabel( item ) }
										</span>
									</label>
								);
							} ) }
							{ ! visibleItems.length &&
							! loading &&
							! loadError ? (
								<p className="ap-multiselect-popover__state">
									{ emptyText ||
										__( 'No matching items.', 'aponto' ) }
								</p>
							) : null }
							{ loading ? (
								<p className="ap-multiselect-popover__state">
									<Spinner />
									{ loadingText ||
										__( 'Loading…', 'aponto' ) }
								</p>
							) : null }
							{ loadError ? (
								<p className="ap-multiselect-popover__state is-error">
									<span>
										{ errorText ||
											__(
												'Could not load items.',
												'aponto'
											) }
									</span>
									<Button
										variant="link"
										onClick={ () =>
											setRetry(
												( current ) => current + 1
											)
										}
									>
										{ __( 'Retry', 'aponto' ) }
									</Button>
								</p>
							) : null }
						</div>
						{ hasMore && ! loading ? (
							<p className="ap-multiselect-popover__more">
								{ sprintf(
									__(
										'Showing the first %d matches. Refine your search for more.',
										'aponto'
									),
									perPage
								) }
							</p>
						) : null }
					</div>
				) }
			/>
			{ help ? <p className="ap-multiselect__help">{ help }</p> : null }
			{ validationMessage ? (
				<p className="ap-multiselect__error">{ validationMessage }</p>
			) : null }
		</div>
	);
}

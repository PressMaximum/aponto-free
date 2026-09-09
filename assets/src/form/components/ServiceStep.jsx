/** @jsxImportSource preact */
/**
 * Step 1 — Service (SPEC-P1 §2.2 #1).
 *
 * Hybrid pattern: a type-to-filter search that returns a flat "Category / Service"
 * list, plus a category drill-down when idle. When there is ≤1 category or only a
 * few services the widget drops straight to a flat list — no pointless category
 * hop. Rows show name + one-line description on the left, price + duration on the
 * right, and a selection tick last. Selecting a service hands it into the rest of
 * the flow.
 *
 * The layout is the design reference's 820px `.ap-main.service` catalogue
 * (`docs/mockups/v4/booking-form/`, "Category & service display · option 2").
 * Unlike the mockup's 33-service fixture, a real fresh site has no categories, no
 * descriptions and often no prices, so both the row anatomy and the step's sub
 * degrade explicitly rather than leaving holes in the design.
 */
import { useState, useMemo } from 'preact/hooks';
import { IconSearch, IconChevronRight, IconCheck } from './icons.jsx';
import { StepHeader } from './StepHeader.jsx';
import { formatMoney, formatDuration } from '../lib/format.js';
import { COPY, sprintf } from '../lib/copy.js';

/**
 * Above this many services a flat catalogue earns a search field. The reference
 * catalogue always carries one because its dataset is 33 services; a 3-row list
 * does not, so the threshold is tied to the thing that actually makes scanning
 * hard — `.ap-list.scroll` caps at 352px, which is where a ~6-row list starts to
 * clip. Below it the list IS the search, and the step's sub says so.
 */
const FLAT_THRESHOLD = 5;

/**
 * One catalogue row — the reference's `.ap-svc` anatomy: name over a one-line
 * description on the left, price over duration on the right, selection tick last.
 *
 * Two degradations the reference dataset never exercises (every mockup service
 * has a description and a price), decided here:
 *   - no description AND no category path -> the row is a single line, so it
 *     centers (`is-single`) instead of top-aligning a 2-line meta against a
 *     1-line title;
 *   - no price -> the duration is the only meta, so it steps up from the `xs`
 *     secondary size to `sm` rather than sitting alone as micro-type.
 */
function ServiceRow( { service, selected, showPath, onClick } ) {
	const price = formatMoney(
		service.price_minor,
		service.currency,
		service.__locale,
		service.__exponent
	);
	// Search results carry BOTH the category path and the description, the path
	// as a soft prefix — losing the description in search results made the same
	// row read differently depending on how the visitor got to it.
	const path = showPath
		? ( service.category ? service.category.name : COPY.all_services )
		: '';
	const desc = service.description || '';
	const hasSub = !! ( path || desc );
	return (
		<button
			type="button"
			class={
				'ap-svc' +
				( hasSub ? '' : ' is-single' ) +
				( price ? '' : ' no-price' )
			}
			aria-pressed={ selected ? 'true' : 'false' }
			onClick={ onClick }
		>
			<span class="txt">
				<span class="ap-item-title">{ service.name }</span>
				{ hasSub ? (
					<small>
						{ path ? (
							<span class="path">{ path }{ desc ? ' · ' : '' }</span>
						) : null }
						{ desc }
					</small>
				) : null }
			</span>
			<span class="meta">
				{ price ? <span class="price">{ price }</span> : null }
				<span class="dur">
					{ formatDuration( service.duration_minutes, service.__locale ) }
				</span>
			</span>
			<span class="tick" aria-hidden="true">
				<IconCheck />
			</span>
		</button>
	);
}

export function ServiceStep( {
	services,
	categories,
	locale,
	// Server-supplied ISO exponent for the site currency (D-R39a); rides the same
	// per-row injection as the locale so `ServiceRow` needs no new prop.
	currencyExponent = null,
	selectedId,
	stepIndex,
	stepCount,
	focusOnMount,
	onSelect,
} ) {
	const [ query, setQuery ] = useState( '' );
	const [ openCat, setOpenCat ] = useState( null );

	const withLocale = useMemo(
		() =>
			services.map( ( s ) =>
				Object.assign( { __locale: locale, __exponent: currencyExponent }, s )
			),
		[ services, locale, currencyExponent ]
	);

	// Categories that actually hold at least one active service — an empty category never
	// renders a dead drill-in row and never forces the browse layout.
	const usableCategories = useMemo(
		() =>
			categories.filter( ( c ) =>
				services.some( ( s ) => s.category && s.category.id === c.id )
			),
		[ categories, services ]
	);

	// SPEC-P1 §2.2: MORE THAN ONE category → category browse + search, whatever the service
	// count. A small multi-category catalogue previously fell through to the flat list (the
	// service-count short-circuit), hiding the categories entirely (fleet-r1 U2 F4).
	const flat = usableCategories.length <= 1;
	const showSearch =
		!! services.length && ( ! flat || services.length > FLAT_THRESHOLD );
	const q = query.trim().toLowerCase();

	// The sub describes the controls that are actually on screen. Promising "browse
	// a category or search by name" above a bare 4-row list with neither control is
	// what made the fresh-site step read as broken.
	const sub = ! services.length
		? ''
		: ! flat
		? COPY.service_sub
		: showSearch
		? COPY.service_sub_search
		: COPY.service_sub_plain;

	const searchResults = useMemo( () => {
		if ( ! q ) {
			return null;
		}
		return withLocale.filter( ( s ) => {
			const hay = (
				s.name +
				' ' +
				( s.description || '' ) +
				' ' +
				( s.category ? s.category.name : '' )
			).toLowerCase();
			return hay.includes( q );
		} );
	}, [ q, withLocale ] );

	function minPrice( catId ) {
		const prices = withLocale
			.filter( ( s ) => s.category && s.category.id === catId )
			.map( ( s ) => s.price_minor )
			.filter( ( p ) => p !== null && p !== undefined );
		if ( ! prices.length ) {
			return '';
		}
		return formatMoney(
			Math.min( ...prices ),
			services[ 0 ].currency,
			locale,
			currencyExponent
		);
	}

	function catServices( catId ) {
		return withLocale.filter(
			( s ) => s.category && s.category.id === catId
		);
	}

	function renderBody() {
		if ( ! services.length ) {
			return (
				<div class="ap-empty">
					{ COPY.no_services }
					<br />
					<span class="ap-sum-sub">{ COPY.no_services_sub }</span>
				</div>
			);
		}

		// Active search — flat results across everything.
		if ( searchResults ) {
			if ( ! searchResults.length ) {
				return (
					<div class="ap-empty">
						{ sprintf( COPY.no_matches, query.trim() ) }
					</div>
				);
			}
			return (
				<div class="ap-list scroll">
					{ searchResults.map( ( s ) => (
						<ServiceRow
							key={ s.id }
							service={ s }
							selected={ s.id === selectedId }
							showPath
							onClick={ () => onSelect( s ) }
						/>
					) ) }
				</div>
			);
		}

		// Flat catalogue for small businesses.
		if ( flat ) {
			return (
				<div class="ap-list scroll">
					{ withLocale.map( ( s ) => (
						<ServiceRow
							key={ s.id }
							service={ s }
							selected={ s.id === selectedId }
							onClick={ () => onSelect( s ) }
						/>
					) ) }
				</div>
			);
		}

		// Drilled into a category.
		if ( openCat ) {
			const cat = categories.find( ( c ) => c.id === openCat );
			return (
				<div>
					<div class="ap-crumbs">
						<button type="button" onClick={ () => setOpenCat( null ) }>
							{ COPY.all_categories }
						</button>
						<IconChevronRight />
						<span>{ cat ? cat.name : '' }</span>
					</div>
					<div class="ap-list scroll">
						{ catServices( openCat ).map( ( s ) => (
							<ServiceRow
								key={ s.id }
								service={ s }
								selected={ s.id === selectedId }
								onClick={ () => onSelect( s ) }
							/>
						) ) }
					</div>
				</div>
			);
		}

		// Category landing.
		const uncategorized = withLocale.filter( ( s ) => ! s.category );
		return (
			<div class="ap-list">
				{ usableCategories.map( ( c ) => {
					const count = catServices( c.id ).length;
					const from = minPrice( c.id );
					return (
						<button
							type="button"
							class="ap-cat"
							key={ c.id }
							onClick={ () => setOpenCat( c.id ) }
						>
							<span class="txt">
								<span class="ap-item-title">{ c.name }</span>
								<small>
									{ count === 1
										? COPY.service_count_one
										: sprintf(
												COPY.services_count,
												count
										  ) }
									{ from
										? ' · ' + sprintf( COPY.from_price, from )
										: '' }
								</small>
							</span>
							<span class="chev" aria-hidden="true">
								<IconChevronRight />
							</span>
						</button>
					);
				} ) }
				{ uncategorized.map( ( s ) => (
					<ServiceRow
						key={ s.id }
						service={ s }
						selected={ s.id === selectedId }
						onClick={ () => onSelect( s ) }
					/>
				) ) }
			</div>
		);
	}

	return (
		<div class="ap-step">
			<StepHeader
				title={ COPY.service_title }
				sub={ sub }
				stepIndex={ stepIndex }
				stepCount={ stepCount }
				focusOnMount={ focusOnMount }
			/>
			{ showSearch && (
				<label class="ap-search">
					<IconSearch />
					<input
						class="ap-input"
						type="search"
						value={ query }
						placeholder={ COPY.search_placeholder }
						aria-label={ COPY.search_placeholder }
						onInput={ ( e ) => setQuery( e.target.value ) }
					/>
				</label>
			) }
			{ renderBody() }
		</div>
	);
}

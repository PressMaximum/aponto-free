/**
 * Pure browse-filter logic for the Modules catalog (D-R21, 2026-07-25).
 *
 * The Modules screen combines three independent filters with AND: the category
 * tabs, the Industry select and the free-text search box — the same combination
 * the mockup's `filteredModules()` applies (docs/mockups/v4/plugin-dashboard/
 * assets/js/plugin-dashboard.js). Kept framework- and i18n-free so it is unit
 * testable in the node Jest environment; every display string is injected by the
 * caller through `resolveText`.
 *
 * The mockup's Status and License selects are deliberately NOT part of this
 * module: D-R21 approved the Industry filter only, and D-R22 (mixed editions and
 * card states in the catalog) did not re-open that scope.
 */

/** Sentinel industry id: matches every industry, on a module and as a filter value. */
export const INDUSTRY_ALL = 'all';

/** Sentinel category id used by the "All" tab. */
export const CATEGORY_ALL = 'all';

/**
 * The controlled industry vocabulary (D-R21), in display order. Mirrors the
 * registry's `industries` field; `all` is the sentinel and is not listed here.
 */
export const INDUSTRY_IDS = [
	'beauty',
	'coaching',
	'fitness',
	'healthcare',
	'events',
	'venues',
	'agencies',
	'field_services',
];

/**
 * A module's industry tags, defensively normalized. A registry entry that ships
 * without the field (older boot data) reads as untagged.
 *
 * @param {{industries?: string[]}} mod Module record.
 * @return {string[]} Industry ids.
 */
export function moduleIndustries( mod ) {
	return Array.isArray( mod?.industries ) ? mod.industries.filter( ( id ) => typeof id === 'string' ) : [];
}

/**
 * Industry predicate. `all` on either side matches; an untagged module stays
 * visible rather than disappearing from every industry view (forward-compat with
 * a bundle newer than its boot data).
 *
 * @param {{industries?: string[]}} mod      Module record.
 * @param {string}                  industry Selected industry id.
 * @return {boolean} Whether the module belongs to the industry.
 */
export function matchesIndustry( mod, industry ) {
	if ( ! industry || industry === INDUSTRY_ALL ) {
		return true;
	}
	const tags = moduleIndustries( mod );
	if ( tags.length === 0 ) {
		return true;
	}

	return tags.includes( INDUSTRY_ALL ) || tags.includes( industry );
}

/**
 * Category predicate (the tab strip).
 *
 * @param {{category?: string}} mod      Module record.
 * @param {string}              category Selected category id.
 * @return {boolean} Whether the module belongs to the category.
 */
export function matchesCategory( mod, category ) {
	return ! category || category === CATEGORY_ALL || mod?.category === category;
}

/**
 * Free-text predicate over the caller-supplied display strings (title,
 * description, category label, industry labels). Matching is case-insensitive
 * substring, like the mockup's haystack.
 *
 * @param {Object}   mod         Module record.
 * @param {string}   query       Raw query string.
 * @param {Function} resolveText `( mod ) => string[]` searchable strings.
 * @return {boolean} Whether the module matches the query.
 */
export function matchesQuery( mod, query, resolveText ) {
	const needle = String( query || '' ).trim().toLowerCase();
	if ( '' === needle ) {
		return true;
	}
	const parts = typeof resolveText === 'function' ? resolveText( mod ) : [];
	const haystack = [ mod?.code, ...( Array.isArray( parts ) ? parts : [] ) ]
		.filter( ( part ) => typeof part === 'string' && '' !== part )
		.join( ' ' )
		.toLowerCase();

	return haystack.includes( needle );
}

/**
 * Apply every active filter with AND, preserving registry order.
 *
 * @param {Object[]} modules             Module records.
 * @param {Object}   filters             Active filters.
 * @param {string}   [filters.category]  Category id (`all` = no filter).
 * @param {string}   [filters.industry]  Industry id (`all` = no filter).
 * @param {string}   [filters.query]     Free-text query.
 * @param {Function} [resolveText]       `( mod ) => string[]` searchable strings.
 * @return {Object[]} Matching modules.
 */
export function filterModules( modules, filters = {}, resolveText ) {
	const { category = CATEGORY_ALL, industry = INDUSTRY_ALL, query = '' } = filters;
	const list = Array.isArray( modules ) ? modules : [];

	return list.filter(
		( mod ) =>
			matchesCategory( mod, category ) &&
			matchesIndustry( mod, industry ) &&
			matchesQuery( mod, query, resolveText )
	);
}

/**
 * Whether any filter other than the category tab is narrowing the view — used to
 * decide between "this category is empty" and "clear a filter" copy.
 *
 * @param {Object} filters            Active filters.
 * @param {string} [filters.industry] Industry id.
 * @param {string} [filters.query]    Free-text query.
 * @return {boolean} Whether a browse filter is active.
 */
export function hasBrowseFilters( filters = {} ) {
	const { industry = INDUSTRY_ALL, query = '' } = filters;

	return industry !== INDUSTRY_ALL || '' !== String( query || '' ).trim();
}

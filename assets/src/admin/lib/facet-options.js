/**
 * Pure facet-option helpers shared by the two list-facet surfaces: the product-owned
 * Bookings facets (`.pd-*`, `bookings/BookingsTable.jsx`) and the kit-based B4b list
 * facets (`.pmdk-*`, `lib/facets.jsx`).
 *
 * A facet option's identity is the RECORD ID, never the display name — the same defect
 * the Combobox fix closed (`lib/combobox-options.js`). Two services, staff or categories
 * may legitimately share a name ("Haircut" from `wp aponto seed` plus the wizard's own
 * default), and a name-keyed facet collapses them into ONE option: the checkbox filters
 * on the shared name, and any name → id lookup for the server (CSV export, reorder)
 * resolves to whichever record `find()` happened to hit first, so the user silently sees
 * only one record's rows.
 *
 * Contract:
 *   - Facets over catalog records (service / staff / category) are RECORD-keyed: the
 *     filter value is the record identity `id:<id>`, the option label is the name, and
 *     two same-named records stay two options that filter independently.
 *   - Facets over genuine enums or free-text column values (status, location name) stay
 *     VALUE-keyed: there the column value IS the identity.
 *
 * Identity strings are prefixed (`id:` / `name:`) exactly like `optionKey()` in
 * `combobox-options.js`, so a record id can never collide with a fallback label and a
 * name-keyed regression is obvious in the DOM.
 */

const ID_PREFIX = 'id:';
const NAME_PREFIX = 'name:';

/**
 * Facet identity of one record for a record-keyed facet.
 *
 * `id:<id>` whenever the row carries an id (0 included — "no location"/"Uncategorized"
 * are real groups). The `name:<label>` branch is defensive: rows whose REST payload has
 * no id for this axis keep filtering by name instead of dropping out of the facet.
 *
 * @param {Object} record   Row record (the plain data object, not a TanStack row).
 * @param {string} idKey    Record field holding the id (e.g. `serviceId`).
 * @param {string} labelKey Record field holding the display name (e.g. `service`).
 * @return {string} Identity string.
 */
export function facetIdentity( record, idKey, labelKey ) {
	const id = record ? record[ idKey ] : undefined;
	if ( id !== undefined && id !== null && id !== '' ) {
		return `${ ID_PREFIX }${ id }`;
	}
	return `${ NAME_PREFIX }${ record?.[ labelKey ] ?? '' }`;
}

/**
 * The numeric record id behind a facet identity, for the server params that take one
 * (`service_id`/`staff_id` on the CSV export). Null when the identity is the defensive
 * name fallback — the caller must then leave that axis unfiltered rather than guess.
 *
 * @param {string} identity Facet identity string.
 * @return {?number} Record id, or null when the identity carries none.
 */
export function facetRecordId( identity ) {
	if ( typeof identity !== 'string' || ! identity.startsWith( ID_PREFIX ) ) {
		return null;
	}
	const id = Number( identity.slice( ID_PREFIX.length ) );
	return Number.isFinite( id ) ? id : null;
}

/**
 * Options for a record-keyed facet: one entry per distinct RECORD in the loaded rows.
 * Same-named records stay separate entries (same label, different value) and filter
 * independently. Sorted by label, then by identity so the order is stable.
 *
 * Records with an empty display name produce no option (nothing to show or search) —
 * the same rule `valueFacetOptions()` applies to empty column values.
 *
 * @param {Array}  records       Row records.
 * @param {Object} keys          Field mapping.
 * @param {string} keys.idKey    Record field holding the id.
 * @param {string} keys.labelKey Record field holding the display name.
 * @return {Array} `[ { value, label, id } ]`.
 */
export function recordFacetOptions( records = [], { idKey, labelKey } = {} ) {
	const byIdentity = new Map();
	( records || [] ).forEach( ( record ) => {
		if ( ! record ) {
			return;
		}
		const label = String( record[ labelKey ] ?? '' );
		if ( ! label ) {
			return;
		}
		const value = facetIdentity( record, idKey, labelKey );
		if ( ! byIdentity.has( value ) ) {
			byIdentity.set( value, { value, label, id: facetRecordId( value ) } );
		}
	} );
	return [ ...byIdentity.values() ].sort(
		( a, b ) => a.label.localeCompare( b.label ) || a.value.localeCompare( b.value )
	);
}

/**
 * Options for a value-keyed facet: the distinct column values themselves (enums, or a
 * name column with no id in the payload). Empty/missing values are skipped.
 *
 * @param {Array}  records Row records.
 * @param {string} key     Record field to collect.
 * @return {Array} `[ { value, label } ]`.
 */
export function valueFacetOptions( records = [], key ) {
	const values = [ ...new Set( ( records || [] ).map( ( record ) => record?.[ key ] ) ) ]
		.filter( ( value ) => value !== undefined && value !== null && value !== '' );
	return values
		.sort( ( a, b ) => String( a ).localeCompare( String( b ) ) )
		.map( ( value ) => ( { value, label: String( value ) } ) );
}

/**
 * Display label for one selected facet value. Falls back to the raw value so an option
 * that has left the loaded window still reads as something.
 *
 * @param {Array} options Facet options.
 * @param {*}     value   Selected value.
 * @return {string} Label.
 */
export function facetOptionLabel( options = [], value ) {
	const match = ( options || [] ).find( ( option ) => option.value === value );
	return match ? match.label : String( value ?? '' );
}

/**
 * Facet-trigger summary: the label when exactly one option is selected, otherwise
 * "N selected".
 *
 * @param {Array} options Facet options.
 * @param {Array} values  Selected values.
 * @return {string} Summary ('' when nothing is selected).
 */
export function facetSummary( options = [], values ) {
	const selected = Array.isArray( values ) ? values : [];
	if ( ! selected.length ) {
		return '';
	}
	if ( selected.length === 1 ) {
		return facetOptionLabel( options, selected[ 0 ] );
	}
	return `${ selected.length } selected`;
}

/**
 * Active-filter chip summary: up to two labels spelled out, then "N selected".
 *
 * @param {Array} options Facet options.
 * @param {Array} values  Selected values.
 * @return {string} Summary.
 */
export function facetChipSummary( options = [], values ) {
	const selected = Array.isArray( values ) ? values : [];
	if ( selected.length > 2 ) {
		return `${ selected.length } selected`;
	}
	return selected.map( ( value ) => facetOptionLabel( options, value ) ).join( ', ' );
}

/**
 * filterFn factory for a record-keyed facet: keep rows whose RECORD identity is one of
 * the selected identities. Matching on the id is what makes two same-named records
 * filter to disjoint row sets.
 *
 * @param {string} idKey    Record field holding the id.
 * @param {string} labelKey Record field holding the display name.
 * @return {Function} TanStack `filterFn`.
 */
export function recordFacetFilter( idKey, labelKey ) {
	return function recordFacetFilterFn( row, _columnId, values ) {
		if ( ! Array.isArray( values ) || ! values.length ) {
			return true;
		}
		return values.includes( facetIdentity( row.original, idKey, labelKey ) );
	};
}

/**
 * filterFn for a value-keyed facet: keep rows whose column value is one of the selected
 * values (enums, or a name column the payload gives no id for).
 *
 * @param {Object} row      TanStack row.
 * @param {string} columnId Column id.
 * @param {Array}  values   Selected values.
 * @return {boolean} Whether the row is kept.
 */
export function inArrayFilter( row, columnId, values ) {
	return ! Array.isArray( values ) || ! values.length || values.includes( row.getValue( columnId ) );
}

/**
 * filterFn for a toggle facet: keep rows whose (boolean) column value is true — only when
 * the toggle is on.
 *
 * @param {Object}  row      TanStack row.
 * @param {string}  columnId Column id.
 * @param {boolean} value    Whether the toggle is on.
 * @return {boolean} Whether the row is kept.
 */
export function isTrueFilter( row, columnId, value ) {
	return ! value || row.getValue( columnId ) === true;
}

/**
 * Options for one facet definition. A definition supplies `options` explicitly (array or
 * a function of the row records), names an `idKey` to become record-keyed, or falls back
 * to its column values.
 *
 * @param {Object} definition Facet definition (`id`/`columnId`, optional `idKey`,
 *                            `labelKey`, `options`).
 * @param {Array}  records    Pre-filtered row records.
 * @return {Array} Facet options.
 */
export function facetOptions( definition, records = [] ) {
	if ( definition.options ) {
		return typeof definition.options === 'function' ? definition.options( records ) : definition.options;
	}
	const labelKey = definition.labelKey || definition.id || definition.columnId;
	if ( definition.idKey ) {
		return recordFacetOptions( records, { idKey: definition.idKey, labelKey } );
	}
	return valueFacetOptions( records, labelKey );
}

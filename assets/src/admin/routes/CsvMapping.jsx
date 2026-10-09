import { SelectControl } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

/** Display destination fields while retaining the REST header-to-field contract. */
export function CsvMapping( { fields, inspected, mapping, onChange, busy, submitted = false, entity } ) {
	const headers = inspected.headers;
	const valueOf = ( header ) => Object.prototype.hasOwnProperty.call( mapping, header ) ? mapping[ header ] : undefined;
	const unused = headers.filter( ( header ) => ! valueOf( header ) );
	const undecided = unused.filter( ( header ) => valueOf( header ) !== '' );
	function assign( field, header ) {
		const next = Object.assign( Object.create( null ), mapping );
		for ( const previous of headers ) {
			if ( next[ previous ] === field ) next[ previous ] = undefined;
		}
		if ( header ) next[ header ] = field;
		onChange( next );
	}
	function groupFor( field ) {
		if ( field.key.startsWith( 'location_' ) ) return __( 'Location', 'aponto' );
		if ( entity === 'services' && field.key.startsWith( 'staff_' ) ) return __( 'Staff', 'aponto' );
		if ( [ 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'time_off' ].includes( field.key ) ) return __( 'Work hours and time off', 'aponto' );
		if ( [ 'buffer_before', 'buffer_after', 'slot_step_minutes', 'min_lead_minutes', 'max_horizon_days' ].includes( field.key ) ) return __( 'Booking settings', 'aponto' );
		return entity === 'services' ? __( 'Service details', 'aponto' ) : entity === 'staff' ? __( 'Staff details', 'aponto' ) : __( 'Details', 'aponto' );
	}
	const groups = new Map();
	for ( const field of fields ) {
		const name = entity ? groupFor( field ) : '';
		if ( ! groups.has( name ) ) groups.set( name, [] );
		groups.get( name ).push( field );
	}
	return <>
		<div className="pd-table-wrap"><table className="ap-csv-mapping-table"><colgroup><col /><col /><col /></colgroup><thead><tr><th>{ __( 'Destination field', 'aponto' ) }</th><th>{ __( 'CSV column', 'aponto' ) }</th><th>{ __( 'Example', 'aponto' ) }</th></tr></thead>{ [ ...groups ].map( ( [ name, items ] ) => <tbody key={ name }>{ name && <tr className="ap-csv-ui__group"><th colSpan="3" scope="colgroup">{ name }</th></tr> }{ items.map( ( field ) => {
			const header = headers.find( ( candidate ) => valueOf( candidate ) === field.key ) || '';
			const sample = header ? inspected.sample?.[ 0 ]?.cells?.[ headers.indexOf( header ) ] : '';
			const invalid = !! ( submitted && field.required && ! header );
			return <tr key={ field.key }><th scope="row">{ field.label }{ field.required && <><span className="ap-csv-required" aria-hidden="true"> *</span><span className="screen-reader-text">{ __( ' (required)', 'aponto' ) }</span></> }</th><td><SelectControl __nextHasNoMarginBottom aria-required={ !! field.required } aria-invalid={ !! invalid } aria-describedby={ invalid ? `csv-mapping-error-${ field.key }` : undefined } aria-label={ sprintf( field.required ? __( 'CSV column for %s (required)', 'aponto' ) : __( 'CSV column for %s', 'aponto' ), field.label ) } disabled={ busy } value={ header } onChange={ ( value ) => assign( field.key, value ) } options={ [ { value: '', label: field.required ? __( 'Choose CSV column…', 'aponto' ) : __( 'Not imported', 'aponto' ) }, ...headers.map( ( value ) => ( { value, label: value } ) ) ] } />{ invalid && <p className="ap-csv-ui__field-error" id={ `csv-mapping-error-${ field.key }` } role="alert">{ sprintf( __( 'Choose a CSV column for %s.', 'aponto' ), field.label ) }</p> }</td><td><span className="ap-csv-sample">{ sample !== undefined && sample !== null && sample !== '' ? sample : <span className="ap-csv-empty-sample" title={ header ? __( 'Empty cell in CSV', 'aponto' ) : __( 'No CSV column selected', 'aponto' ) }><span aria-hidden="true">—</span><span className="screen-reader-text">{ header ? __( 'Empty cell in CSV', 'aponto' ) : __( 'No CSV column selected', 'aponto' ) }</span></span> }</span></td></tr>;
		} ) }</tbody> ) }</table></div>
		<p className="ap-module-panel__help">{ __( '— indicates an empty CSV cell or an unselected column; it is not an imported value.', 'aponto' ) }</p>
		{ unused.length > 0 && <div className="ap-csv-unused" role={ submitted && undecided.length ? 'alert' : undefined }><p>{ sprintf( __( 'Unused CSV columns: %s', 'aponto' ), unused.join( ', ' ) ) }</p>{ undecided.length > 0 ? <button type="button" className="pd-button" disabled={ busy } onClick={ () => onChange( { ...mapping, ...Object.fromEntries( undecided.map( ( header ) => [ header, '' ] ) ) } ) }>{ __( 'Ignore unused columns', 'aponto' ) }</button> : <p className="ap-module-panel__help">{ __( 'These columns will be ignored.', 'aponto' ) }</p> }</div> }
	</>;
}

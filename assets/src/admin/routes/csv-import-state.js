/** Validate column decisions without coupling the UI to any entity field list. */
export function mappingProblems( headers, mapping, fields ) {
	const owns = ( header ) => Object.prototype.hasOwnProperty.call( mapping, header );
	const selected = headers.map( ( header ) => owns( header ) ? mapping[ header ] : undefined );
	return {
		undecided: headers.filter( ( header ) => ! owns( header ) || mapping[ header ] === undefined ),
		missing: fields.filter( ( field ) => field.required && ! selected.includes( field.key ) ),
		duplicates: selected.filter( ( key, index ) => key && selected.indexOf( key ) !== index ),
	};
}

export function rowCounts( rows = [] ) {
	return rows.reduce( ( counts, row ) => {
		if ( [ 'create', 'created' ].includes( row.status ) ) counts.create++;
		if ( [ 'reuse', 'reused' ].includes( row.status ) ) counts.reuse++;
		if ( row.status === 'error' ) counts.error++;
		return counts;
	}, { create: 0, reuse: 0, error: 0 } );
}

/** Reports contain only row numbers and outcomes, never source customer values. */
export function reportCsv( rows = [] ) {
	const cell = ( value ) => '"' + String( value ?? '' ).replace( /^[=+@\-\t\r]/, "'$&" ).replace( /"/g, '""' ) + '"';
	return [ [ 'row', 'status', 'aponto_id', 'errors' ], ...rows.map( ( row ) => [ row.line, row.status, row.target_id, Object.values( row.errors || {} ).join( '; ' ) ] ) ].map( ( row ) => row.map( cell ).join( ',' ) ).join( '\r\n' );
}

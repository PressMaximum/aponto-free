import { __ } from '@wordpress/i18n';
import { reportCsv } from './csv-import-state.js';

/** Encode one bounded binary slice, preserving split UTF-8 sequences. */
export async function encodeSlice( file, start, end ) {
	const bytes = new Uint8Array( await file.slice( start, end ).arrayBuffer() );
	let binary = '';
	for ( let i = 0; i < bytes.length; i += 8192 ) binary += String.fromCharCode( ...bytes.subarray( i, i + 8192 ) );
	return btoa( binary );
}

/** Replay from zero on resume: the server verifies all previously accepted bytes. */
export async function uploadChunks( { file, job, chunkBytes, put, stopped, onJob } ) {
	for ( let index = 0; index * chunkBytes < file.size && ! stopped(); index++ ) {
		const data = await encodeSlice( file, index * chunkBytes, Math.min( file.size, ( index + 1 ) * chunkBytes ) );
		if ( stopped() ) break;
		job = await put( `/imports/${ encodeURIComponent( job.id ) }/chunks/${ index }`, { data } );
		onJob( job );
	}
	return job;
}

/** Keep report text only; never retain all decrypted row objects. */
export async function collectReport( { id, total, get, stopped, maxBytes = 32 * 1024 * 1024, onProgress } ) {
	const parts = [];
	let size = 0;
	for ( let offset = 0; offset < total; offset += 100 ) {
		if ( stopped() ) return null;
		const page = await get( `/imports/${ encodeURIComponent( id ) }/rows`, { offset, limit: 100 } );
		if ( stopped() ) return null;
		if ( ! page.rows?.length ) throw new Error( __( 'The report page is unavailable.', 'aponto' ) );
		const text = ( offset ? '\r\n' : '' ) + ( offset ? reportCsv( page.rows ).split( '\r\n' ).slice( 1 ).join( '\r\n' ) : reportCsv( page.rows ) );
		size += new TextEncoder().encode( text ).byteLength;
		if ( size > maxBytes ) throw new Error( __( 'The report exceeds the 32 MiB download limit. Use the paginated report instead.', 'aponto' ) );
		parts.push( text );
		onProgress?.( Math.min( total, offset + page.rows.length ) );
	}
	return parts.length ? parts : [ reportCsv( [] ) ];
}

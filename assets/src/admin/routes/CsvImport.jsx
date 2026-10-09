import { CsvMapping } from './CsvMapping.jsx';
import { useEffect, useRef, useState } from 'react';
import { SelectControl } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { PageHeader, RouteLoading, RouteError } from '../lib/ui.jsx';
import { moduleAvailable } from '../modules/catalog.js';
import { mappingProblems, rowCounts } from './csv-import-state.js';
import './csv-import.css';
import { LargeCsvImport } from './LargeCsvImport.jsx';

function download( text, name ) {
	const url = URL.createObjectURL( new Blob( [ text ], { type: 'text/csv;charset=utf-8' } ) );
	const link = document.createElement( 'a' );
	link.href = url;
	link.download = name;
	link.click();
	setTimeout( () => URL.revokeObjectURL( url ), 1000 );
}

export function CsvImport( { segments = [], embedded = false, basePath = 'import-csv' } ) {
	const [ entity, setEntity ] = useState( '' );
	const [ schema, setSchema ] = useState( null );
	const [ error, setError ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const [ csv, setCsv ] = useState( '' );
	const [ delimiter, setDelimiter ] = useState( ',' );
	const [ inspected, setInspected ] = useState( null );
	const [ mapping, setMapping ] = useState( {} );
	const [ job, setJob ] = useState( null );
	const [ page, setPage ] = useState( 0 );
	const alive = useRef( true );
	const working = useRef( false );
	const fileRead = useRef( 0 );
	const jobId = segments[ 1 ];
	const allowed = ( config.caps.bookings || config.caps.services || config.caps.staff || config.caps.settings ) && moduleAvailable( config, 'csv_import' );
	useEffect( () => { alive.current = true; return () => { alive.current = false; }; }, [] );
	async function action( task ) {
		if ( working.current ) return;
		working.current = true;
		setBusy( true ); setError( null );
		try { await task(); } catch ( caught ) { if ( alive.current ) setError( caught ); }
		finally { working.current = false; if ( alive.current ) setBusy( false ); }
	}
	async function load() {
		await action( async () => {
			const nextJob = jobId ? await api.get( `/imports/${ encodeURIComponent( jobId ) }` ) : null;
			const nextEntity = nextJob?.entity || '';
			const nextSchema = await api.get( '/imports/schema' + ( nextEntity ? `?entity=${ encodeURIComponent( nextEntity ) }` : '' ) );
			if ( alive.current ) { setSchema( nextSchema ); setEntity( nextEntity ); setJob( nextJob ); setPage( 0 ); }
		} );
	}
	useEffect( () => { if ( allowed ) load(); }, [ jobId, allowed ] );
	async function chooseEntity( nextEntity ) {
		fileRead.current++;
		setEntity( '' ); setCsv( '' ); setInspected( null ); setMapping( {} ); setDelimiter( ',' );
		if ( ! nextEntity ) return;
		await action( async () => {
			const nextSchema = await api.get( `/imports/schema?entity=${ encodeURIComponent( nextEntity ) }` );
			if ( alive.current ) { setSchema( nextSchema ); setEntity( nextEntity ); }
		} );
	}
	const entityInfo = schema?.entities?.find( ( item ) => item.key === ( job?.entity || entity ) );
	const counts = rowCounts( job?.rows );
	const problems = mappingProblems( inspected?.headers || [], mapping, schema?.fields || [] );
	const canMap = ! problems.undecided.length && ! problems.missing.length && ! problems.duplicates.length;
	const ready = job?.status === 'ready';
	async function run() {
		await action( async () => {
			let current = job;
			do {
				current = await api.post( `/imports/${ encodeURIComponent( job.id ) }/run`, {} );
				if ( alive.current ) setJob( current );
			} while ( alive.current && current.status === 'running' );
		} );
	}
	if ( allowed && schema?.upload && ( ! job || job.paged ) && ( ! jobId || job ) ) return <LargeCsvImport schema={ schema } initialJob={ job } embedded={ embedded } basePath={ basePath } />;
	return <section className="ap-csv-import" aria-busy={ busy }>
		{ ! embedded && <PageHeader title={ __( 'CSV import', 'aponto' ) } actions={ <a className="pd-button" href="#modules/csv_import">{ __( 'Module settings', 'aponto' ) }</a> } /> }
		{ ! allowed ? <p role="alert">{ __( 'CSV import requires permission to manage the selected data and an available CSV import module.', 'aponto' ) }</p> : <>
			{ error && <div role="alert"><RouteError message={ error.message } onRetry={ ! schema || ( jobId && ! job ) ? load : undefined } />{ error.code === 'aponto_validation' && error.data?.fields && <ul>{ Object.entries( error.data.fields ).filter( ( [ , message ] ) => typeof message === 'string' ).map( ( [ field, message ] ) => <li key={ field }>{ message }</li> ) }</ul> }</div> }
			{ ! schema && ! error && <RouteLoading label={ __( 'Loading import options…', 'aponto' ) } /> }
			{ schema && ! job && ! jobId && <>
				{ ! inspected && schema.jobs?.length > 0 && <details className="ap-csv-recent">
					<summary>{ sprintf( __( 'Recent imports (%d)', 'aponto' ), schema.jobs.length ) }</summary>
					<div className="pd-table-wrap"><table className="pd-table"><thead><tr><th>{ __( 'Data type', 'aponto' ) }</th><th>{ __( 'File', 'aponto' ) }</th><th>{ __( 'Progress', 'aponto' ) }</th><th>{ __( 'Actions', 'aponto' ) }</th></tr></thead><tbody>{ schema.jobs.map( ( recent ) => <tr key={ recent.id }><td>{ schema.entities?.find( ( item ) => item.key === recent.entity )?.label || recent.entity }</td><td>{ recent.filename || __( 'CSV file', 'aponto' ) }</td><td>{ recent.status === 'ready' ? __( 'Ready to import', 'aponto' ) : recent.status === 'completed' ? __( 'Completed', 'aponto' ) : sprintf( __( '%1$d of %2$d rows processed', 'aponto' ), recent.processed || 0, recent.total ) }</td><td><div className="ap-csv-actions"><a className="pd-button sm" href={ `#${ basePath }/${ recent.id }` }>{ recent.status === 'completed' ? __( 'View report', 'aponto' ) : __( 'Resume', 'aponto' ) }</a><button type="button" className="pd-button sm" disabled={ busy } onClick={ () => action( async () => {
						await api.del( `/imports/${ encodeURIComponent( recent.id ) }` );
						setSchema( ( current ) => ( { ...current, jobs: current.jobs.filter( ( item ) => item.id !== recent.id ) } ) );
					} ) }>{ __( 'Delete report', 'aponto' ) }</button></div></td></tr> ) }</tbody></table></div>
					<p className="ap-csv-hint">{ __( 'Previews and reports are kept for 24 hours. Deleting a report does not remove imported records.', 'aponto' ) }</p>
				</details> }
				{ ! inspected && <div className="ap-csv-fields"><SelectControl __nextHasNoMarginBottom label={ __( 'What would you like to import?', 'aponto' ) } disabled={ busy } value={ entity } onChange={ chooseEntity } options={ [ { value: '', label: __( 'Choose a data type…', 'aponto' ) }, ...( schema.entities || [] ).filter( ( item ) => item.available !== false && item.key !== 'staff_services' ).map( ( item ) => ( { value: item.key, label: item.label } ) ) ] } /><p className="ap-csv-hint">{ entityInfo?.description || __( 'Choose a data type, then upload its CSV file.', 'aponto' ) }</p></div> }
				{ entity && <>
				<ol className="ap-csv-steps" aria-label={ __( 'Import steps', 'aponto' ) }><li aria-current={ ! inspected ? 'step' : undefined }>{ __( '1. Choose file', 'aponto' ) }</li><li aria-current={ inspected ? 'step' : undefined }>{ __( '2. Match columns', 'aponto' ) }</li><li>{ __( '3. Review and import', 'aponto' ) }</li></ol>
				{ ! inspected ? <form onSubmit={ ( event ) => { event.preventDefault(); action( async () => {
					const result = await api.post( '/imports/inspect', { entity, csv, delimiter } );
					const suggestions = Object.fromEntries( result.headers.map( ( header ) => [ header, Object.prototype.hasOwnProperty.call( result.mapping || {}, header ) ? result.mapping[ header ] || undefined : undefined ] ) );
					setMapping( suggestions ); setInspected( result );
				} ); } }>
					<div className="ap-csv-fields"><label>{ __( 'CSV file (UTF-8)', 'aponto' ) }<input type="file" accept=".csv,text/csv" required disabled={ busy } onChange={ async ( e ) => {
						const file = e.target.files[ 0 ]; const readId = ++fileRead.current; setCsv( '' ); setError( null );
						if ( ! file ) return;
						if ( file.size > schema.limits.bytes ) { setError( new Error( __( 'The file exceeds the import size limit.', 'aponto' ) ) ); return; }
						try { const text = await file.text(); if ( alive.current && readId === fileRead.current ) setCsv( text ); } catch ( caught ) { if ( alive.current && readId === fileRead.current ) setError( caught ); }
					} } /><small>{ sprintf( __( 'Up to %1$d rows and %2$d KB.', 'aponto' ), schema.limits.rows, Math.floor( schema.limits.bytes / 1024 ) ) }</small></label>
					<SelectControl __nextHasNoMarginBottom label={ __( 'Column separator', 'aponto' ) } disabled={ busy } value={ delimiter } onChange={ setDelimiter } options={ [ { value: ',', label: __( 'Comma', 'aponto' ) }, { value: ';', label: __( 'Semicolon', 'aponto' ) }, { value: '\t', label: __( 'Tab', 'aponto' ) } ] } /></div>
					<div className="ap-csv-actions"><button className="pd-button primary" disabled={ busy || ! csv }>{ __( 'Match columns', 'aponto' ) }</button><button type="button" className="pd-button" disabled={ busy } onClick={ () => action( async () => download( await api.get( `/imports/template?entity=${ encodeURIComponent( entity ) }` ), `aponto-${ entity }-example.csv` ) ) }>{ __( 'Download example CSV', 'aponto' ) }</button></div>
					<p className="ap-module-panel__help">{ __( 'Includes sample records. Replace them with your own data before importing.', 'aponto' ) }</p>
				</form> : <form onSubmit={ ( event ) => { event.preventDefault(); action( async () => {
					const result = await api.post( '/imports/preview', { entity, csv, delimiter, mapping } );
					setJob( result ); setPage( 0 ); window.location.hash = `${ basePath }/${ result.id }`;
				} ); } }>
					<p>{ __( 'Match each source column to a field, or explicitly choose to ignore it.', 'aponto' ) }</p>
					<CsvMapping fields={ schema.fields } inspected={ inspected } mapping={ mapping } onChange={ setMapping } busy={ busy } />
					{ problems.missing.length > 0 && <p>{ sprintf( __( 'Required fields: %s', 'aponto' ), problems.missing.map( ( field ) => field.label ).join( ', ' ) ) }</p> }
					{ problems.duplicates.length > 0 && <p role="alert">{ __( 'Each destination field can receive only one CSV column.', 'aponto' ) }</p> }
					<div className="ap-csv-actions"><button className="pd-button primary" disabled={ busy || ! canMap }>{ __( 'Preview import', 'aponto' ) }</button><button className="pd-button" type="button" disabled={ busy } onClick={ () => setInspected( null ) }>{ __( 'Back', 'aponto' ) }</button></div>
				</form> }
				</> }
			</> }
			{ job && <>
				<h2>{ ready ? __( 'Review import', 'aponto' ) : job.status === 'completed' ? __( 'Import complete', 'aponto' ) : __( 'Import progress', 'aponto' ) }</h2>
				<p>{ entityInfo?.label }</p>
				<p role="status" aria-live="polite">{ sprintf( __( '%1$d new · %2$d existing · %3$d errors', 'aponto' ), counts.create, counts.reuse, counts.error ) }</p>
				{ ready ? <p>{ entityInfo?.review_message || __( 'Only valid rows will be imported. Rows with errors are skipped; existing records are kept unchanged.', 'aponto' ) }</p> : <><progress max={ job.total || 1 } value={ job.processed || 0 } aria-label={ __( 'Import progress', 'aponto' ) } /><p>{ sprintf( __( '%1$d of %2$d rows processed.', 'aponto' ), job.processed || 0, job.total ) }</p></> }
				<div className="pd-table-wrap"><table className="pd-table"><thead><tr><th>{ __( 'Row', 'aponto' ) }</th><th>{ __( 'Result', 'aponto' ) }</th><th>{ __( 'Details', 'aponto' ) }</th></tr></thead><tbody>{ ( job.rows || [] ).slice( page * 25, page * 25 + 25 ).map( ( row ) => <tr key={ row.line }><td>{ row.line }</td><td>{ ( { create: __( 'Will create', 'aponto' ), reuse: __( 'Use existing', 'aponto' ), created: __( 'Created', 'aponto' ), reused: __( 'Used existing', 'aponto' ), error: __( 'Error', 'aponto' ) } )[ row.status ] || row.status }</td><td>{ Object.values( row.errors || {} ).join( ' · ' ) || ( ready ? Object.values( row.values || {} ).filter( ( value ) => [ 'string', 'number', 'boolean' ].includes( typeof value ) ).join( ' · ' ) : row.target_id ? sprintf( __( 'Record #%d', 'aponto' ), row.target_id ) : '' ) }</td></tr> ) }</tbody></table></div>
				{ job.rows?.length > 25 && <div className="ap-csv-actions"><button className="pd-button sm" disabled={ page === 0 } onClick={ () => setPage( page - 1 ) }>{ __( 'Previous', 'aponto' ) }</button><span>{ page + 1 } / { Math.ceil( job.rows.length / 25 ) }</span><button className="pd-button sm" disabled={ ( page + 1 ) * 25 >= job.rows.length } onClick={ () => setPage( page + 1 ) }>{ __( 'Next', 'aponto' ) }</button></div> }
				<div className="ap-csv-actions">{ job.status !== 'completed' && <button className="pd-button primary" disabled={ busy || ( ready && counts.create + counts.reuse === 0 ) } onClick={ run }>{ busy ? __( 'Importing…', 'aponto' ) : ready ? __( 'Import valid rows', 'aponto' ) : __( 'Continue import', 'aponto' ) }</button> }<button className="pd-button" disabled={ busy } onClick={ () => action( async () => { await api.del( `/imports/${ encodeURIComponent( job.id ) }` ); setJob( null ); setInspected( null ); setCsv( '' ); window.location.hash = basePath; } ) }>{ ready ? __( 'Discard preview', 'aponto' ) : __( 'Delete report', 'aponto' ) }</button></div>
				<p className="ap-csv-hint">{ __( 'Previews and reports are kept for 24 hours. Deleting the preview or report does not remove imported records. Return from Recent imports or keep this page URL to resume.', 'aponto' ) }</p>
			</> }
		</> }
	</section>;
}

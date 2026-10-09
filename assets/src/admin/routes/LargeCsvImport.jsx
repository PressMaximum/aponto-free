import { CsvMapping } from './CsvMapping.jsx';
import { useEffect, useRef, useState } from 'react';
import { SelectControl, CheckboxControl } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { PageHeader } from '../lib/ui.jsx';
import { mappingProblems } from './csv-import-state.js';
import { uploadChunks } from './large-csv-state.js';

function save( parts, filename ) {
	const url = URL.createObjectURL( new Blob( parts, { type: 'text/csv;charset=utf-8' } ) );
	const link = document.createElement( 'a' ); link.href = url; link.download = filename; link.click();
	setTimeout( () => URL.revokeObjectURL( url ), 1000 );
}

export function LargeCsvImport( { schema: initialSchema, initialJob = null, embedded, basePath } ) {
	const [ schema, setSchema ] = useState( initialSchema );
	const [ job, setJob ] = useState( initialJob );
	const [ entity, setEntity ] = useState( initialJob?.entity || '' );
	const [ file, setFile ] = useState( null );
	const [ submitted, setSubmitted ] = useState( 0 );
	const container = useRef( null );
	const [ dragging, setDragging ] = useState( false );
	const picker = useRef( null );
	const dragDepth = useRef( 0 );
	const [ delimiter, setDelimiter ] = useState( ',' );
	const [ updateStaff, setUpdateStaff ] = useState( false );
	const [ updateServices, setUpdateServices ] = useState( false );
	const [ inspected, setInspected ] = useState( null );
	const [ mapping, setMapping ] = useState( {} );
	const [ error, setError ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const [ importing, setImporting ] = useState( false );
	const errorNotice = useRef( null );
	useEffect( () => { if ( error ) { errorNotice.current?.focus(); errorNotice.current?.scrollIntoView?.( { block: 'center' } ); } }, [ error ] );
	const [ openingUpload, setOpeningUpload ] = useState( false );
	const live = useRef( true );
	const stop = useRef( false );
	const working = useRef( false );
	const generation = useRef( 0 );
	const operationId = useRef( 0 );
	const restored = useRef( initialJob?.id );
	const current = useRef( initialJob );
	const inspectionAttempt = useRef( null );
	const info = schema.entities?.find( ( item ) => item.key === entity );
	useEffect( () => { live.current = true; return () => { live.current = false; stop.current = true; generation.current++; }; }, [] );
	function accept( next ) {
		current.current = next;
		if ( live.current ) {
			setJob( next );
			if ( next?.id && window.location.hash !== `#${ basePath }/${ next.id }` ) window.history.replaceState( window.history.state, '', `#${ basePath }/${ next.id }` );
		}
	}
	useEffect( () => {
		if ( initialJob?.id && initialJob.id !== restored.current ) {
			inspectionAttempt.current = null; restored.current = initialJob.id; generation.current++; operationId.current++; stop.current = true; working.current = false; setBusy( false ); setOpeningUpload( false ); setError( null );
			setSchema( initialSchema ); accept( initialJob ); setEntity( initialJob.entity ); setFile( null ); setInspected( null ); setMapping( {} ); setSubmitted( 0 ); setImporting( false );
		}
	}, [ initialJob?.id ] );
	async function task( callback ) {
		if ( working.current ) return;
		working.current = true; stop.current = false; setBusy( true ); setError( null );
		const version = generation.current;
		const operation = ++operationId.current;
		const stopped = () => stop.current || ! live.current || version !== generation.current;
		try { await callback( stopped, ( next ) => { if ( live.current && version === generation.current ) accept( next ); } ); } catch ( caught ) { if ( live.current && version === generation.current ) setError( caught ); }
		finally { if ( operation === operationId.current ) working.current = false; if ( live.current && version === generation.current && operation === operationId.current ) { setBusy( false ); } }
	}
	async function choose( key ) {
		setSubmitted( 0 ); setUpdateStaff( false ); setUpdateServices( false ); setEntity( '' ); setFile( null ); setMapping( {} ); setInspected( null ); setDelimiter( ',' );
		if ( key ) await task( async ( stopped ) => { const next = await api.get( '/imports/schema', { entity: key } ); if ( ! stopped() ) { setSchema( next ); setEntity( key ); } } );
	}
	function openPicker() {
		if ( busy || ! picker.current ) return;
		picker.current.value = '';
		picker.current.click();
	}
	function dropFile( event ) {
		event.preventDefault(); dragDepth.current = 0; setDragging( false );
		if ( busy ) return;
		if ( event.dataTransfer.files.length !== 1 ) { setFile( null ); setError( new Error( __( 'Choose one CSV file at a time.', 'aponto' ) ) ); return; }
		pickFile( event.dataTransfer.files[ 0 ] );
	}
	useEffect( () => { dragDepth.current = 0; setDragging( false ); }, [ busy, entity ] );
	function pickFile( next ) {
		setError( null ); setFile( null );
		if ( ! next ) return;
		if ( ! /\.csv$/i.test( next.name ) ) { setError( new Error( __( 'Choose a CSV file ending in .csv.', 'aponto' ) ) ); return; }
		if ( ! next.size || next.size > schema.upload.bytes ) { setError( new Error( __( 'Choose a non-empty CSV within the upload size limit.', 'aponto' ) ) ); return; }
		if ( job && next.size !== job.upload_size ) { setError( new Error( __( 'Choose the original file with the same size. Its contents will also be verified.', 'aponto' ) ) ); return; }
		setFile( next );
	}
	async function inspect( active, stopped ) {
		inspectionAttempt.current = active.id;
		const result = await api.post( `/imports/${ encodeURIComponent( active.id ) }/inspect-upload`, {} );
		if ( stopped() ) return;
		setInspected( result );
		if ( active.status !== 'uploaded' ) { setMapping( active.mapping || {} ); return; }
		setMapping( Object.fromEntries( result.headers.map( ( header ) => [ header, Object.prototype.hasOwnProperty.call( result.mapping || {}, header ) ? result.mapping[ header ] || undefined : undefined ] ) ) );
	}
	useEffect( () => {
		const canInspect = job?.status === 'uploaded' || ( [ 'validating', 'ready' ].includes( job?.status ) && Array.isArray( job?.headers ) && job?.mapping );
		if ( ! canInspect || inspected || busy || working.current || inspectionAttempt.current === job.id || current.current?.id !== job.id ) return;
		inspectionAttempt.current = job.id;
		task( ( stopped ) => inspect( job, stopped ) );
	}, [ job?.id, job?.status, inspected, busy ] );
	async function upload() {
		await task( async ( stopped, update ) => {
			let active = current.current;
			if ( ! active ) {
				active = await api.post( '/imports/uploads', { entity, filename: file.name, size: file.size, delimiter, ...( [ 'services', 'staff' ].includes( entity ) ? { update_staff: updateStaff, update_services: updateServices } : {} ) } );
				update( active );
			} else {
				active = await api.get( `/imports/${ encodeURIComponent( active.id ) }` ); update( active );
			}
			if ( stopped() ) return;
			active = await uploadChunks( { file, job: active, chunkBytes: schema.upload.chunk_bytes, put: api.put, stopped, onJob: update } );
			if ( ! stopped() && active.status === 'uploaded' ) await inspect( active, stopped );
		} );
	}
	async function run() {
		if ( working.current ) return;
		setSubmitted( ( count ) => count + 1 );
		if ( needsCheck && ! canMap ) return;
		const version = generation.current;
		setImporting( true );
		try { await task( async ( stopped, update ) => {
			let active = current.current;
			if ( needsCheck || active.status === 'validating' ) {
				let first = active.status !== 'validating';
				do {
					active = await api.post( `/imports/${ encodeURIComponent( active.id ) }/prepare`, first ? { mapping } : {} );
					first = false; update( active );
				} while ( ! stopped() && active.status === 'validating' );
			}
			if ( stopped() || ! [ 'ready', 'running' ].includes( active.status ) ) return;
			if ( active.status === 'ready' && ! ( active.counts?.create || active.counts?.reuse ) ) return;
			do { active = await api.post( `/imports/${ encodeURIComponent( active.id ) }/run`, {} ); update( active ); } while ( ! stopped() && active.status === 'running' );
		} ); } finally { if ( live.current && generation.current === version ) setImporting( false ); }
	}
	async function chooseAnother() {
		if ( working.current ) return;
		const version = generation.current;
		setOpeningUpload( true );
		try {
			await task( async ( stopped ) => {
				const next = await api.get( '/imports/schema' );
				if ( stopped() ) return;
				inspectionAttempt.current = null; restored.current = null; accept( null ); setSchema( next ); setSubmitted( 0 ); setUpdateStaff( false ); setUpdateServices( false ); setEntity( '' ); setFile( null ); setInspected( null ); setMapping( {} ); setSubmitted( 0 ); window.location.hash = basePath;
			} );
		} finally {
			if ( live.current && generation.current === version ) setOpeningUpload( false );
		}
	}

	const problems = mappingProblems( inspected?.headers || [], mapping, schema.fields || [] );
	const canMap = ! problems.undecided.length && ! problems.missing.length && ! problems.duplicates.length;
	const mappingDirty = job?.status === 'ready' && inspected && inspected.headers.some( ( header ) => mapping[ header ] !== job.mapping?.[ header ] );
	const needsCheck = job?.status === 'uploaded' || mappingDirty;
	const counts = job?.counts || {};
	const fileStep = ! job || job.status === 'uploading';
	const mappingPreview = inspected || ( Array.isArray( job?.headers ) && job?.mapping ? { headers: job.headers, sample: [] } : null );
	const displayedMapping = inspected ? mapping : job?.mapping || {};
	const activeImport = importing || job?.status === 'running';
	const showMapping = ! activeImport && mappingPreview && [ 'uploaded', 'validating', 'ready' ].includes( job?.status );
	useEffect( () => {
		if ( submitted && ! canMap ) {
			const field = container.current?.querySelector( '[aria-invalid="true"], .ap-csv-unused button' );
			field?.focus(); field?.scrollIntoView?.( { block: 'center' } );
		}
	}, [ submitted ] );
	return <section className="ap-module-panel ap-csv-import ap-csv-cards ap-csv-ui" aria-busy={ busy } ref={ container }>
		{ ! embedded && <PageHeader title={ __( 'CSV import', 'aponto' ) } /> }
		<div className="ap-csv-ui__card">
		<header className="ap-csv-ui__rail"><h2>{ fileStep ? __( 'Import your CSV', 'aponto' ) : sprintf( __( 'Import: %s', 'aponto' ), info?.label || entity ) }</h2></header>
		<div className="ap-csv-ui__body">
		{ ! fileStep && <div className="ap-csv-ui__heading"><p>{ job?.status === 'completed' ? __( 'Your import has finished.', 'aponto' ) : activeImport ? __( 'Your records are being processed. Keep this page open until the import finishes.', 'aponto' ) : __( 'Choose the CSV column for each field. Check the example to confirm the match.', 'aponto' ) }</p></div> }
		{ error && <div className="ap-csv-ui__notice is-error" role="alert" tabIndex={ -1 } ref={ errorNotice }><p>{ error.message }</p>{ error.data?.fields && <ul>{ Object.values( error.data.fields ).filter( ( text ) => typeof text === 'string' ).map( ( text, index ) => <li key={ index }>{ text }</li> ) }</ul> }</div> }
		{ job && ! fileStep && <div className="ap-csv-ui__file"><span aria-hidden="true">CSV</span><div><strong>{ job.filename }</strong><small>{ info?.label }{ Number.isFinite( job.total ) ? ` · ${ sprintf( __( '%d records', 'aponto' ), job.total ) }` : '' }</small></div>{ showMapping && <span className="ap-csv-ui__file-note">{ __( 'Example shows the first data row', 'aponto' ) }</span> }</div> }
		{ fileStep && <div className="ap-csv-ui__form">
			{ ! job && <>
			<div className="ap-csv-fields"><SelectControl __nextHasNoMarginBottom label={ __( 'What would you like to import?', 'aponto' ) } disabled={ busy } value={ entity } onChange={ choose } options={ [ { value: '', label: __( 'Choose a data type…', 'aponto' ) }, ...( schema.entities || [] ).filter( ( item ) => item.available !== false && item.key !== 'staff_services' ).map( ( item ) => ( { value: item.key, label: item.label } ) ) ] } /></div>
			{ info?.description && <p className="ap-module-panel__intro">{ info.description }</p> }</> }
			{ entity && <>
				<input ref={ picker } key={ entity } className="ap-csv-file-input" hidden type="file" accept=".csv,text/csv" aria-label={ __( 'CSV file (UTF-8)', 'aponto' ) } disabled={ busy } onChange={ ( event ) => { const selected = event.target.files[ 0 ]; event.target.value = ''; if ( ! busy ) pickFile( selected ); } } />
				<div className={ `ap-csv-ui__drop ap-csv-dropzone${ dragging ? ' is-dragging' : '' }` } role="button" tabIndex={ busy ? -1 : 0 } aria-disabled={ busy } aria-label={ __( 'Choose CSV file (UTF-8)', 'aponto' ) } onClick={ openPicker } onKeyDown={ ( event ) => { if ( event.key === 'Enter' || event.key === ' ' ) { event.preventDefault(); openPicker(); } } } onDragEnter={ ( event ) => { event.preventDefault(); if ( ! busy ) { dragDepth.current++; setDragging( true ); } } } onDragOver={ ( event ) => { event.preventDefault(); if ( event.dataTransfer ) event.dataTransfer.dropEffect = busy ? 'none' : 'copy'; } } onDragLeave={ ( event ) => { event.preventDefault(); dragDepth.current = Math.max( 0, dragDepth.current - 1 ); if ( ! dragDepth.current ) setDragging( false ); } } onDrop={ dropFile }>
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M4 15v5h16v-5" /></svg><span className="ap-csv-dropzone__title">{ __( 'Drop your CSV file here', 'aponto' ) }</span>
					<p>{ __( 'or click to choose a file', 'aponto' ) }</p>
					<small>{ sprintf( __( 'UTF-8 CSV · Up to %1$d MiB · %2$d rows', 'aponto' ), Math.floor( schema.upload.bytes / 1048576 ), schema.upload.rows ) }</small>
				</div>
				{ file && <p>{ file.name } · { ( file.size / 1048576 ).toFixed( 2 ) } MiB</p> }
				{ job && <p>{ __( 'To resume, select the original file. Every previously uploaded part is verified before new parts are accepted.', 'aponto' ) }</p> }
				{ ! job && <div className="ap-csv-fields"><SelectControl __nextHasNoMarginBottom label={ __( 'Column separator', 'aponto' ) } disabled={ busy } value={ delimiter } onChange={ setDelimiter } options={ [ { value: ',', label: __( 'Comma', 'aponto' ) }, { value: ';', label: __( 'Semicolon', 'aponto' ) }, { value: '\t', label: __( 'Tab', 'aponto' ) } ] } /></div> }
				{ ! job && <p className="ap-module-panel__help">{ __( 'Includes sample records. Replace them with your own data before importing.', 'aponto' ) }</p> }
			{ ! job && [ 'services', 'staff' ].includes( entity ) && <div className="ap-csv-fields"><CheckboxControl label={ __( 'Update existing staff', 'aponto' ) } help={ __( 'Match by email and update supplied non-empty profile fields. Blank cells keep existing values.', 'aponto' ) } checked={ updateStaff } onChange={ setUpdateStaff } disabled={ busy } />{ entity === 'services' && <CheckboxControl label={ __( 'Update existing services', 'aponto' ) } checked={ updateServices } onChange={ setUpdateServices } disabled={ busy } /> }{ entity === 'staff' && <p>{ __( 'Supplied weekdays replace hours for those days; OFF closes a day. Blank days stay unchanged. Time off adds absences.', 'aponto' ) }</p> }</div> }
			{ job?.status === 'uploading' && <><progress value={ job.upload_received } max={ job.upload_size } aria-label={ __( 'Upload progress', 'aponto' ) } /><p role="status">{ sprintf( __( '%1$d of %2$d bytes uploaded.', 'aponto' ), job.upload_received, job.upload_size ) }</p></> }</> }
		</div> }
		{ ! fileStep && ! activeImport && [ 'uploaded', 'ready', 'validating' ].includes( job?.status ) && ! inspected && <p role="status">{ busy ? __( 'Loading examples…', 'aponto' ) : __( 'Examples could not be loaded. Retry to load the CSV columns.', 'aponto' ) }</p> }
		{ showMapping && <>
			<CsvMapping fields={ schema.fields } entity={ entity } inspected={ mappingPreview } mapping={ displayedMapping } onChange={ setMapping } submitted={ submitted } busy={ busy || ! inspected || job.status === 'validating' } />
			{ submitted > 0 && problems.duplicates.length > 0 && <p role="alert">{ __( 'Each destination field can receive only one CSV column.', 'aponto' ) }</p> }
		</> }
		{ ( importing || [ 'validating', 'running' ].includes( job?.status ) ) && <div className="ap-csv-ui__notice" role="status"><strong>{ job?.status === 'validating' || job?.status === 'uploaded' ? __( 'Checking your data…', 'aponto' ) : __( 'Importing…', 'aponto' ) }</strong><p>{ job?.status === 'validating' ? sprintf( __( '%d rows validated.', 'aponto' ), job.validated || 0 ) : sprintf( __( '%1$d of %2$d rows processed.', 'aponto' ), job?.processed || 0, job?.total || 0 ) }</p><progress value={ job?.status === 'validating' ? job.validated || 0 : job?.processed || 0 } max={ job?.total || 1 } aria-label={ __( 'Import progress', 'aponto' ) } /></div> }
		{ job?.status === 'ready' && ! mappingDirty && ! importing && ! ( counts.create || counts.reuse ) && <div className="ap-csv-ui__notice is-error" role="alert"><p>{ job.total === 0 ? __( 'No data rows were found in this file. Add at least one row, then choose the file again. No records were imported.', 'aponto' ) : __( 'No rows are ready to import. Correct the CSV data and choose another file.', 'aponto' ) }</p></div> }
		{ job?.status === 'completed' && <div className="ap-csv-ui__metrics" role="status">{ [ [ counts.created || 0, __( 'Created', 'aponto' ) ], [ counts.reused || 0, __( 'Existing records', 'aponto' ) ], [ counts.error || 0, __( 'Error count', 'aponto' ) ] ].map( ( [ number, label ] ) => <div key={ label }><strong>{ number }</strong><span>{ label }</span></div> ) }</div> }
		{ job?.status === 'failed' && <div className="ap-csv-ui__notice is-error" role="alert"><strong>{ __( 'Import could not be prepared', 'aponto' ) }</strong><p>{ job.failure }</p><p>{ __( 'Choose another file to start again. No records were imported from this failed preview.', 'aponto' ) }</p></div> }
		</div>
		{ ( job || entity ) && <footer className="ap-csv-ui__footer ap-csv-workflow__actions">
			<div className="ap-csv-actions">
				{ ! job && entity && <button className="pd-button" disabled={ busy } onClick={ () => task( async ( stopped ) => { const text = await api.get( '/imports/template', { entity } ); if ( ! stopped() ) save( [ text ], `aponto-${ entity }-example.csv` ); } ) }>{ __( 'Download example CSV', 'aponto' ) }</button> }
				{ job && job.status !== 'completed' && <button className="pd-button" disabled={ busy || job.status === 'running' } aria-busy={ openingUpload } onClick={ chooseAnother }>{ openingUpload ? __( 'Opening upload…', 'aponto' ) : __( 'Choose another file', 'aponto' ) }</button> }
			</div>
			<div className="ap-csv-actions">
				{ fileStep && entity && <button className="pd-button primary" disabled={ busy || ! file } onClick={ upload }>{ job ? __( 'Resume upload', 'aponto' ) : __( 'Next', 'aponto' ) }</button> }
				{ ! fileStep && ! activeImport && [ 'uploaded', 'ready' ].includes( job?.status ) && ! inspected && <button className="pd-button" disabled={ busy } onClick={ () => task( ( stopped ) => inspect( job, stopped ) ) }>{ __( 'Retry loading examples', 'aponto' ) }</button> }
				{ [ 'uploaded', 'ready', 'validating', 'running' ].includes( job?.status ) && <button className="pd-button primary" disabled={ busy || ( job.status === 'uploaded' && ! inspected ) || ( job.status === 'ready' && ! mappingDirty && ! ( counts.create || counts.reuse ) ) } onClick={ run }>{ importing ? __( 'Importing…', 'aponto' ) : job.status === 'running' ? __( 'Continue import', 'aponto' ) : __( 'Start import', 'aponto' ) }</button> }
				{ job?.status === 'completed' && <button className="pd-button primary" disabled={ busy } aria-busy={ openingUpload } onClick={ chooseAnother }>{ openingUpload ? __( 'Opening upload…', 'aponto' ) : __( 'Import another file', 'aponto' ) }</button> }
			</div>
		</footer> }
		</div>
	</section>;
}

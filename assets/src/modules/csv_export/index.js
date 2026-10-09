import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../../admin/lib/api.js';
import '../../admin/routes/csv-import.css';
import './export.css';

export function CsvExportPanel() {
 const [ entities, setEntities ] = useState( [] );
 const [ entity, setEntity ] = useState( '' );
 const [ busy, setBusy ] = useState( false );
 const [ error, setError ] = useState( '' );
 const [ count, setCount ] = useState( null );
 const alive = useRef( true );
 const running = useRef( false );
 useEffect( () => {
  alive.current = true;
  api.get( '/exports/schema' ).then( data => { if ( alive.current ) setEntities( data.entities ); } ).catch( e => { if ( alive.current ) setError( e.data?.fields?.export || e.message ); } );
  return () => { alive.current = false; };
 }, [] );
 async function download( entity ) {
  if ( running.current || ! entity ) return;
  running.current = true; setEntity( entity ); setBusy( true ); setError( '' ); setCount( 0 );
  try {
   const parts = []; let offset = 0, rows = 0, bytes = 0;
   do {
    const page = await api.get( '/exports/rows', { entity, offset } );
    if ( ! alive.current ) return;
    rows += page.count; bytes += new Blob( [ page.csv ] ).size;
    if ( rows > 100000 || bytes > 100 * 1048576 ) throw new Error( __( 'This export exceeds the import limit of 100 MiB or 100000 rows.', 'aponto' ) );
    parts.push( page.csv ); setCount( rows );
    if ( page.next_offset !== null && page.next_offset <= offset ) throw new Error( __( 'Export could not advance. Please retry.', 'aponto' ) );
    offset = page.next_offset;
   } while ( offset !== null );
   const url = URL.createObjectURL( new Blob( parts, { type: 'text/csv;charset=utf-8' } ) );
   const link = document.createElement( 'a' ); link.href = url; link.download = `aponto-${ entity }-export.csv`; link.click();
   setTimeout( () => URL.revokeObjectURL( url ), 1000 );
  } catch ( e ) { if ( alive.current ) setError( e.data?.fields?.export || e.message ); }
  finally { running.current = false; if ( alive.current ) setBusy( false ); }
 }
 return <section className="ap-module-panel ap-csv-import ap-csv-ui"><div className="ap-csv-ui__card">
  <header className="ap-csv-ui__rail"><h2>{ __( 'Export your CSV', 'aponto' ) }</h2></header>
  <div className="ap-csv-ui__body ap-csv-ui__form">
   { error && <div role="alert" className="ap-csv-ui__notice is-error">{ error }</div> }
   <table className="ap-csv-export-list"><tbody>
    { entities.filter( item => item.key !== 'staff_services' ).map( item => <tr key={ item.key } className="ap-csv-export-row">
     <td className="ap-csv-export-row__details">
       <strong>{ item.label }</strong>
      { item.key === 'bookings' && <p className="ap-module-panel__help">{ __( 'Future pending and confirmed bookings.', 'aponto' ) }</p> }
      { item.key === entity && count !== null && ! error && <p role="status">{ busy ? sprintf( __( 'Preparing %d rows…', 'aponto' ), count ) : sprintf( __( 'Downloaded %d rows.', 'aponto' ), count ) }</p> }
     </td>
     <td className="ap-csv-export-row__action">
     <button className="pd-button" disabled={ busy } aria-busy={ busy && item.key === entity } aria-label={ sprintf( __( 'Export %s as CSV', 'aponto' ), item.label ) } onClick={ () => download( item.key ) }>{ busy && item.key === entity ? __( 'Exporting…', 'aponto' ) : __( 'Export CSV', 'aponto' ) }</button>
     </td>
    </tr> ) }
   </tbody></table>
   <p className="ap-module-panel__help">{ __( 'Uses the same columns as CSV import. Archived profiles are excluded. Import customers, locations and staff before services and bookings.', 'aponto' ) }</p>
  </div>
 </div></section>;
}
const namespace = ( window.apontoAdmin = window.apontoAdmin || {} );
if ( typeof namespace.registerModuleSettingsPanel === 'function' ) namespace.registerModuleSettingsPanel( 'csv_export', CsvExportPanel );
else { namespace.moduleSettingsPanels = namespace.moduleSettingsPanels || {}; namespace.moduleSettingsPanels.csv_export = CsvExportPanel; }

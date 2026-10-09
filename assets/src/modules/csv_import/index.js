import { CsvImport } from '../../admin/routes/CsvImport.jsx';

export function CsvImportPanel( { segments = [] } ) {
	const jobId = segments[ 2 ];
	return <CsvImport key={ jobId || 'new' } embedded basePath="modules/csv_import" segments={ jobId ? [ 'import-csv', jobId ] : [] } />;
}

const namespace = ( window.apontoAdmin = window.apontoAdmin || {} );
if ( typeof namespace.registerModuleSettingsPanel === 'function' ) {
	namespace.registerModuleSettingsPanel( 'csv_import', CsvImportPanel );
} else {
	namespace.moduleSettingsPanels = namespace.moduleSettingsPanels || {};
	namespace.moduleSettingsPanels.csv_import = CsvImportPanel;
}

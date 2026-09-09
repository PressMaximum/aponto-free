const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const webpack = require( 'webpack' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const glob = require( 'glob' );
const path = require( 'path' );

const plan = process.env.APONTO_PLAN || 'premium';
const buildVariant = process.env.APONTO_BUILD_VARIANT || 'min';
if ( ! [ 'debug', 'min' ].includes( buildVariant ) ) {
	throw new Error( `Unknown APONTO_BUILD_VARIANT: ${ buildVariant }` );
}
const isMinified = buildVariant === 'min';
const assetSuffix = isMinified ? '.min' : '';

// A module's settings panel is its OWN entry (extension-surface §3.3), discovered per module
// directory rather than listed here, so shipping a module is a source-tree change.
const moduleEntries = ( pattern, prefix ) =>
	Object.fromEntries(
		glob
			.sync( pattern )
			.map( ( entryPath ) => [
				prefix + path.basename( path.dirname( entryPath ) ),
				entryPath,
			] )
	);

// TWO entry shapes, one per OWNING edition (D-R37, 2026-09-04 — the D-R27 amendment):
//   `assets/src/modules/{code}` -> `modules/{code}.js`, built in BOTH plans, for a FREE module.
//   `assets/src/pro/{code}`     -> `pro/{code}.js`,     built only when APONTO_PLAN=premium.
// The Free zip physically excludes `assets/src/pro/**` (distribution.json), so a free module's
// panel could never ride the `pro/` shape — D-R22 flipped three registry entries to
// `edition: free`, and `payments_stripe` (P3) is the first of them with a settings panel.
const freeModuleEntries = moduleEntries( './assets/src/modules/*/index.js', 'modules/' );
const proModuleEntries = moduleEntries( './assets/src/pro/*/index.js', 'pro/' );

// The kit's PREBUILT `table`/`module-card` entries used to inline a PRODUCTION
// jsx-runtime and a private copy of @tanstack/react-table + @dnd-kit, so we
// aliased those two subpaths to the package's `src/` and compiled them with a
// scoped babel rule (B4b, C1). Kit v0.2.1 fixes it at the source (K-019):
// every entry now imports `react/jsx-runtime` — which wp-scripts'
// DependencyExtractionWebpackPlugin maps to WP's `react-jsx-runtime` handle,
// so the consumer's own React decides dev vs production — and the table deps
// are optional peers resolved from OUR node_modules. Both the alias and the
// babel rule are therefore gone; consume the prebuilt entries as shipped.
module.exports = {
	...defaultConfig,
	// WordPress Scripts' generic 244 KiB raw-asset hint counts paired RTL styles and does not
	// model this plugin's delivery cost. Release builds run the stricter gzip budgets below
	// (`budget:form` and `budget:admin`), which fail rather than warn when a bundle regresses.
	performance: false,
	// The readable build is deliberately a real development compilation rather than a
	// post-processed production bundle: module boundaries and identifiers stay useful in a
	// browser debugger. The paired production compilation owns every `.min.*` artifact.
	devtool: false,
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...( defaultConfig.resolve ? defaultConfig.resolve.alias : {} ),
			// The wp.org build resolves only Free-owned gateway code. Premium adds
			// its adapters from assets/src/pro, which distribution.json excludes
			// structurally from the Free source archive (Guideline 5).
			'@aponto/payment-gateways$': path.resolve(
				__dirname,
				plan === 'premium'
					? 'assets/src/pro/payments_paypal/form-registry.js'
					: 'assets/src/form/lib/payment-gateways.free.js'
			),
		},
	},
	entry: {
		form: './assets/src/form/index.js',
		// Block editor script: registers the block + a live ShadowRoot preview.
		// Separate from `admin` so the Preact widget it bundles loads only in the
		// block editor, never in the admin dashboard app.
		'form-editor': './assets/src/form/editor.jsx',
		// Onboarding wizard (React + wp-components), loaded only on its admin screen.
		wizard: './assets/src/wizard/index.js',
		admin: './assets/src/admin/index.js',
		...freeModuleEntries,
		...( plan === 'premium' ? proModuleEntries : {} ),
	},
	output: {
		...defaultConfig.output,
		filename: `[name]${ assetSuffix }.js`,
		chunkFilename: `[name]${ assetSuffix }.js?ver=[chunkhash]`,
		// `clean: true` (not wp-scripts' `clean.keep`) so a rebuild removes every stale artifact,
		// which is what keeps yesterday's lazy chunks from shipping next to today's `admin.js`.
		clean: true,
		// Chunk file names are STABLE (`[name].js`, named by the `webpackChunkName` magic comments
		// in assets/src/admin/**) and cache-busted by wp-scripts' own `?ver=[chunkhash]` query, so
		// the shipped `assets/dist/{edition}/` listing is predictable enough for the packaging
		// assertion in `build/scripts/build-dist.mjs` and for the ≤150 KB gz admin budget report.
		// `publicPath: 'auto'` is webpack's own default, restated because it is load-bearing here:
		// a chunk URL must be derived at RUNTIME from the `<script>` tag that loaded `admin.js`,
		// never baked in and never pinned to the URL PHP enqueued — a `script_loader_src` rewrite
		// (CDN offload, reverse proxy) has to move the chunks together with the bundle.
		publicPath: 'auto',
	},
	optimization: {
		...defaultConfig.optimization,
		minimize: isMinified,
		splitChunks: {
			...defaultConfig.optimization.splitChunks,
			cacheGroups: {
				...defaultConfig.optimization.splitChunks.cacheGroups,
				// wp-scripts switches webpack's `default` cache group off but leaves `defaultVendors`
				// on, so a node_modules package reached ONLY from lazy chunks (the dashboard-kit main
				// entry, which just the settings and modules screens import) is split into a chunk
				// with no name — an `assets/dist/<plan>/665.js` whose filename is a module-graph id
				// and moves whenever the graph does. Name it, so every chunk the admin bundle emits
				// is an `admin-chunk-*.js` next to `admin.js`: predictable to package
				// (`build/scripts/build-dist.mjs`), to glob, and to read in a network panel.
				defaultVendors: {
					test: /[\\/]node_modules[\\/]/,
					chunks: 'async',
					priority: -10,
					reuseExistingChunk: true,
					name: 'admin-chunk-vendor',
				},
			},
		},
	},
	plugins: [
		...defaultConfig.plugins.map( ( plugin ) => {
			if ( plugin.constructor.name !== 'MiniCssExtractPlugin' ) {
				return plugin;
			}

			return new MiniCssExtractPlugin( {
				...plugin.options,
				filename: `[name]${ assetSuffix }.css`,
			} );
		} ),
		// __PLAN__ is packaging/diagnostics only. Never gate feature visibility or authorization here.
		new webpack.DefinePlugin( { __PLAN__: JSON.stringify( plan ) } ),
		// wp-scripts only auto-discovers block metadata under its default source directory.
		new ( require( 'copy-webpack-plugin' ) )( {
			patterns: [
				{
					from: 'assets/src/**/block.json',
					to: ( { absoluteFilename } ) =>
						absoluteFilename.replace( /.*assets[\\/]src/, '.' ),
				},
			],
		} ),
	],
};

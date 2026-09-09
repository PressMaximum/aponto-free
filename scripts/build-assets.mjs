#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const plan = process.argv[ 2 ] || process.env.APONTO_PLAN || 'premium';

if ( ! [ 'free', 'premium' ].includes( plan ) ) {
	throw new Error( `Build plan must be free or premium; received: ${ plan }` );
}

const wpScriptsRoot = path.dirname( require.resolve( '@wordpress/scripts/package.json' ) );
const wpScriptsCli = path.join( wpScriptsRoot, 'bin', 'wp-scripts.js' );
const distDir = path.join( root, 'assets', 'dist', plan );
const minStage = path.join( root, 'build', '.asset-build', plan, 'min' );

function runBuild( variant, outputDir, nodeEnv ) {
	const result = spawnSync(
		process.execPath,
		[ wpScriptsCli, 'build', `--output-path=${ outputDir }` ],
		{
			cwd: root,
			env: {
				...process.env,
				APONTO_PLAN: plan,
				APONTO_BUILD_VARIANT: variant,
				NODE_ENV: nodeEnv,
			},
			stdio: 'inherit',
		}
	);

	if ( result.error ) {
		throw result.error;
	}
	if ( result.status !== 0 ) {
		throw new Error( `${ variant } asset build failed with exit code ${ result.status }` );
	}
}

function filesUnder( directory, base = directory ) {
	const files = [];
	for ( const entry of fs.readdirSync( directory, { withFileTypes: true } ) ) {
		const absolute = path.join( directory, entry.name );
		if ( entry.isDirectory() ) {
			files.push( ...filesUnder( absolute, base ) );
		} else if ( entry.isFile() ) {
			files.push( path.relative( base, absolute ) );
		}
	}
	return files;
}

function minDestination( relative ) {
	// wp-scripts' RTL plugin keys its filename from the chunk name rather than the
	// MiniCssExtractPlugin filename. The min compilation therefore emits `x-rtl.css` beside
	// `x.min.css`; normalize it to WordPress' `x-rtl.min.css` convention while merging.
	if ( relative.endsWith( '-rtl.css' ) ) {
		return relative.replace( /-rtl\.css$/, '-rtl.min.css' );
	}
	if ( /\.min\.(?:js|css|asset\.php)$/.test( relative ) ) {
		return relative;
	}
	return null;
}

function copyMinifiedAssets() {
	for ( const relative of filesUnder( minStage ) ) {
		const destinationRelative = minDestination( relative );
		if ( null === destinationRelative ) {
			continue;
		}
		const destination = path.join( distDir, destinationRelative );
		fs.mkdirSync( path.dirname( destination ), { recursive: true } );
		fs.copyFileSync( path.join( minStage, relative ), destination );
	}
}

function assertPairs() {
	const missing = [];
	for ( const relative of filesUnder( distDir ) ) {
		let pair = null;
		if ( relative.endsWith( '-rtl.css' ) ) {
			pair = relative.replace( /-rtl\.css$/, '-rtl.min.css' );
		} else if ( relative.endsWith( '.js' ) && ! relative.endsWith( '.min.js' ) ) {
			pair = relative.replace( /\.js$/, '.min.js' );
		} else if ( relative.endsWith( '.css' ) && ! relative.endsWith( '.min.css' ) ) {
			pair = relative.replace( /\.css$/, '.min.css' );
		} else if ( relative.endsWith( '.asset.php' ) && ! relative.endsWith( '.min.asset.php' ) ) {
			pair = relative.replace( /\.asset\.php$/, '.min.asset.php' );
		}

		if ( pair && ! fs.existsSync( path.join( distDir, pair ) ) ) {
			missing.push( `${ relative } -> ${ pair }` );
		}
	}

	if ( missing.length ) {
		throw new Error( `Asset build is missing debug/minified pairs:\n- ${ missing.join( '\n- ' ) }` );
	}
}

fs.rmSync( distDir, { recursive: true, force: true } );
fs.rmSync( minStage, { recursive: true, force: true } );

try {
	// wp-scripts derives readable CSS/Babel output from NODE_ENV. Both compilations still use the
	// same source graph and dependency-extraction contract; only readability/minification differs.
	runBuild( 'debug', distDir, 'development' );
	runBuild( 'min', minStage, 'production' );
	copyMinifiedAssets();
	assertPairs();
} finally {
	fs.rmSync( path.join( root, 'build', '.asset-build', plan ), { recursive: true, force: true } );
}

console.log( `Built ${ plan } debug and minified asset pairs in ${ path.relative( root, distDir ) }.` );

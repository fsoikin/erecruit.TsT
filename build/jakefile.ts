/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../lib/jake/jake.d.ts" />
/// <reference path="../lib/jasmine/jasmine-node.d.ts" />

import path = require( "path" );
import fs = require( "fs" );
import Jasmine = require( "jasmine" );

export var a = 54;

let rootDir = path.resolve( path.dirname( require.resolve( "./jakefile.js" ) ), ".." );
let fromRoot = ( p: string ) => path.resolve( rootDir, p );
let outDir = process.env.outDir || fromRoot( "built" );
let typescriptPath = process.env.typescriptPath || process.env.tsPath || fromRoot( "node_modules/typescript/bin/tsc" );
let typescriptHost = process.env.host || process.env.TYPESCRIPT_HOST || "node";
let jasmineConfigPath = fromRoot( "built/tests/jasmine.json" );

let sourceFiles = ["src/**/*.ts", "lib/**/*.ts"].map( fromRoot );
let sources = new jake.FileList();
sources.include( sourceFiles );

let tests = new jake.FileList();
tests.include( sourceFiles );
tests.include( fromRoot( "tests/**/*.ts" ) );
tests.exclude( fromRoot( "tests/integration/src/**/*.ts" ) );

let nodeModule = toOutDir( 'tst-node.js' );
let nodeModuleTypings = toOutDir( 'tst-node.d.ts' );
let freeModule = toOutDir( 'tst.js' );
let freeModuleTypings = toOutDir( 'tst.d.ts' );
let executableModule = toOutDir( 'tstc.js' );
let typeScriptBaseTypings = toOutDir( 'lib.d.ts' );
let outputs = [nodeModule, nodeModuleTypings, freeModule, freeModuleTypings, executableModule, typeScriptBaseTypings];
let testsModule = toOutDir( 'tests/tstSpec.js' );

let lib = wrapLibs();

desc( "Build" ); task( 'default', outputs );
desc( "Clean" ); task( 'clean', [], () => outputs.concat( lib ).forEach( f => fs.existsSync( f ) && fs.unlink( f ) ) );
desc( "Clean, then build" ); task( 'rebuild', ['clean', 'default'] );
desc( "Run tests" ); task( 'test', [testsModule, executableModule], runJasmine, { async: true } );
desc( "Compile tstc" ); task( 'tstc', [executableModule] );
desc( "Compile NodeJS module" ); task( 'node', [nodeModule, nodeModuleTypings] );
desc( "Compile free module" ); task( 'free', [freeModule, freeModuleTypings] );

desc( "Set version number in the various source/config files" ); task( 'version', [], setVersion );
desc( "Update LKG binaries" ); task( 'lkg', outputs, updateLkg );

compileTs( freeModule, sources.toArray(), lib, /* disableTypings */ false, /* mergeOutput */ true );
compileTs( executableModule, [fromRoot('node/tstc.ts')], [freeModule], /* disableTypings */ true, /* mergeOutput */ false, /* prereqs */ [typeScriptBaseTypings] );
compileTs( testsModule, tests.toArray(), lib, /* disableTypings */ true, /* mergeOutput */ true );
wrapFile( freeModule, nodeModule, "(function(erecruit){", "})( { TsT: module.exports } );" );
file( typeScriptBaseTypings, [fromRoot('node/lib.d.ts')], () => jake.cpR( fromRoot( 'node/lib.d.ts' ), typeScriptBaseTypings ) );

file( nodeModuleTypings, [freeModuleTypings], () => {
	console.log( "Building " + nodeModuleTypings );
	let enc = { encoding: 'utf8' };
	jake.mkdirP( path.dirname( nodeModuleTypings ) );

	let content: string = <any>fs.readFileSync( freeModuleTypings, enc );
	content = content
		.replace( 'declare module erecruit.TsT', 'declare module "tst"' )
		.replace( /}\s*declare module erecruit\.TsT([^\s\{])*\s*\{/g, '' )
		.replace( /TsT\./g, '' );
	fs.writeFileSync( nodeModuleTypings, content, enc );
});

function wrapLibs() {
	let raw = new jake.FileList();
	raw.include( fromRoot( "lib/**/*.js" ) );
	if ( fs.existsSync( fromRoot( "lib/wrapped" ) ) ) raw.exclude( fromRoot( "lib/wrapped/**/*" ) );

	let wrapped = raw.toArray()
		.map( ( f ) => ( {
			raw: f,
			wrapped: path.relative( '.', path.resolve( fromRoot( "lib/wrapped" ), path.relative( fromRoot( "lib" ), f ) ) )
		}) )
		.sort();
	wrapped.forEach( w => wrapFile( w.raw, w.wrapped,
		"(function(__root__,module,exports,global,define,require) {\n",
		"\nif (typeof ts !== 'undefined') __root__.ts = ts;\n" +
		"})( typeof global === 'undefined' ? this : global );" ) );

	return wrapped.map( w => w.wrapped );
}

function wrapFile( sourceFile: string, outFile: string, prefix: string, suffix: string ) {
	file( outFile, [sourceFile], () => {
		console.log( "Building " + outFile );
		let enc = { encoding: 'utf8' };
		jake.mkdirP( path.dirname( outFile ) );
		fs.writeFileSync( outFile, prefix, enc );
		fs.appendFileSync( outFile, fs.readFileSync( sourceFile, enc ), enc );
		fs.appendFileSync( outFile, suffix, enc );
	});
}

function compileTs( outFile: string, sources: string[], prefixes: string[], disableTypings?: boolean, mergeOutput: boolean = true, prereqs?: string[] ) {
	file( outFile, sources.concat( prefixes ).concat( prereqs || [] ), () => {
		console.log( "Building " + outFile );
		jake.mkdirP( path.dirname( outFile ) );
		if ( !mergeOutput ) jake.mkdirP( "temp.tmp" );

		let cmd = typescriptHost + " " + typescriptPath +
			" --removeComments --noImplicitAny --module commonjs " +
			( disableTypings ? "" : "-declaration " ) +
			sources.join( " " ) +
			( mergeOutput ? ( " -out " + outFile ) : ( " -outDir temp.tmp" ) );

		let ex = jake.createExec( [cmd] );
		ex.addListener( "stdout", (o: any) => process.stdout.write( o ) );
		ex.addListener( "stderr", (e: any) => process.stderr.write( e ) );
		ex.addListener( "cmdEnd", () => {
			if ( !mergeOutput ) {
				jake.cpR( path.resolve( "temp.tmp", path.dirname( sources[0] ), path.basename( sources[0], ".ts" ) + ".js" ), outFile );
				jake.rmRf( "temp.tmp" );
			}
			if ( fs.existsSync( outFile ) ) prepend( prefixes, outFile );
			complete();
		});
		ex.addListener( "error", function () {
			if ( fs.existsSync( outFile ) ) fs.unlinkSync( outFile );
			console.log( "Compilation of " + outFile + " unsuccessful" );
		});
		ex.run();	

	}, { async: true });
}

function runJasmine() {
	var jasmine = new Jasmine();
	jasmine.loadConfigFile( jasmineConfigPath );
	jasmine.onComplete( complete );
	jasmine.execute();
}

function prepend( prefixFiles: string[], destinationFile: string ) {
	if ( !fs.existsSync( destinationFile ) ) {
		fail( destinationFile + " failed to be created!" );
	}

	let enc = { encoding: 'utf8' };
	let destinationContent = fs.readFileSync( destinationFile, enc );

	fs.writeFileSync( destinationFile, '', enc);
	prefixFiles
		.filter( f => fs.existsSync( f ) )
		.forEach( f => fs.appendFileSync( destinationFile, fs.readFileSync( f, enc ) ) );

	fs.appendFileSync( destinationFile, destinationContent, enc );
}

function toOutDir( file: string ) {
	return path.relative( rootDir, path.resolve( outDir, file ) );
}

function setVersion( versionValue: string ) {
	if ( !versionValue ) {
		console.error( "Version value is required. Pass it as task parameter, i.e. \"jake version[0.5.0]\"." );
		return;
	}

	replace( "src/version.ts", /(\/\*version_goes_here\=\>\*\/\")([^\"]+)(\")/ );
	replace( "package.json", /(version\"\: \")([\d\.]+)(\")/ );
	replace( "dotNet/setup/TsT.wxs", /(Version=\")([\d\.]+)(\")/ );
	replace( "dotNet/vs/source.extension.vsixmanifest", /(\<Identity Id=\"[^\"]+\" Version=\")([\d\.]+)(\")/ );
	replace( "dotNet/CommonAssemblyInfo.cs", /(Value = \")([\d\.]+)(\")/ );

	function replace( file: string, regex: RegExp ) {
		file = fromRoot( file );
		let enc = { encoding: 'utf8' };
		let contents: string = <any>fs.readFileSync( file, enc );
		let newContents = contents.replace( regex, ( _, prefix, __, suffix ) => prefix + versionValue + suffix );
		fs.writeFileSync( file, newContents, enc );
	}
}

function updateLkg() {
	let lkg = fromRoot( 'bin' );
	jake.rmRf( lkg );
	jake.mkdirP( lkg );

	outputs.forEach( f => jake.cpR( f, lkg ) );
	copyIfThere( 'tstc/bin/Release', 'dotNet' );
	copyIfThere( 'setup/bin/Release', 'setup' );

	function copyIfThere( where: string, copyTo: string ) {
		let from = fromRoot( 'dotNet/' + where );

		if ( fs.existsSync( from ) ) {
			let to = path.relative( '.', path.resolve( lkg, copyTo ) );
			jake.mkdirP( to );

			let list = new jake.FileList();
			list.include( ["*.dll", "*.exe", "*.vsixmanifest", "*.msi"].map( f => path.resolve( from, f ) ) );
			list.exclude( ["*vshost*"].map( f => path.resolve( from, f ) ) );
			list.toArray().forEach( f => jake.cpR( path.relative( '.', f ), to ) );
		}
		else {
			console.warn( "WARNING: " + from + " doesn't exist." );
		}
	}
}
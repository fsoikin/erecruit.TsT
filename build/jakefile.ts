/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../lib/jake/jake.d.ts" />

import path = require( "path" );
import fs = require( "fs" );

var rootDir = path.resolve( path.dirname( require.resolve( "./jakefile.js" ) ), ".." );
var fromRoot = ( p: string ) => path.resolve( rootDir, p );
var outDir = process.env.outDir || fromRoot( "bin" );
var typescriptPath = process.env.typescriptPath || process.env.tsPath || fromRoot( "node_modules/typescript/bin/tsc.js" );
var typescriptHost = process.env.host || process.env.TYPESCRIPT_HOST || "node";
var jasminePath = fromRoot( "node_modules/jasmine-focused/bin/jasmine-focused" );

var sourceFiles = ["src/**/*.ts", "lib/**/*.ts"].map( fromRoot );
var sources = new jake.FileList();
sources.include( sourceFiles );

var tests = new jake.FileList();
tests.include( sourceFiles );
tests.include( ["tests/**/*.ts"].map( fromRoot ) );
tests.exclude( ["tests/integration/src/**/*.ts"].map( fromRoot ) );

var nodeModule = toOutDir( 'tst-node.js' );
var nodeModuleTypings = toOutDir( 'tst-node.d.ts' );
var freeModule = toOutDir( 'tst.js' );
var freeModuleTypings = toOutDir( 'tst.d.ts' );
var executableModule = toOutDir( 'tstc.js' );
var testsModule = toOutDir( 'tests/tstSpec.js' );
var typeScriptBaseTypings = toOutDir( 'lib.d.ts' );
var outputs = [nodeModule, nodeModuleTypings, freeModule, freeModuleTypings, executableModule];

var lib = wrapLibs();

desc( "Build" ); task( 'default', outputs );
desc( "Clean" ); task( 'clean', [], () => outputs.concat( lib ).forEach( f => fs.existsSync( f ) && fs.unlink( f ) ) );
desc( "Clean, then build" ); task( 'rebuild', ['clean', 'default'] );
desc( "Run tests" ); task( 'test', [testsModule, executableModule], runJasmine, { async: true } );
desc( "Compile tstc" ); task( 'tstc', executableModule );
desc( "Compile NodeJS module" ); task( 'node', [nodeModule, nodeModuleTypings] );
desc( "Compile free module" ); task( 'free', [freeModule, freeModuleTypings] );

desc( "Set version number in the various source/config files" ); task( 'version', [], setVersion );

compileTs( freeModule, sources.toArray(), lib, /* disableTypings */ false, /* mergeOutput */ true );
compileTs( executableModule, [fromRoot('node/tstc.ts')], [freeModule], /* disableTypings */ true, /* mergeOutput */ false, /* prereqs */ [typeScriptBaseTypings] );
compileTs( testsModule, tests.toArray(), lib, /* disableTypings */ true, /* mergeOutput */ true );
wrapFile( freeModule, nodeModule, "(function(erecruit){", "})( { TsT: module.exports } );" );
file( typeScriptBaseTypings, [fromRoot('node/lib.d.ts')], () => jake.cpR( fromRoot( 'node/lib.d.ts' ), typeScriptBaseTypings ) );

file( nodeModuleTypings, [freeModuleTypings], () => {
	console.log( "Building " + nodeModuleTypings );
	var enc = { encoding: 'utf8' };
	jake.mkdirP( path.dirname( nodeModuleTypings ) );

	var content: string = <any>fs.readFileSync( freeModuleTypings, enc );
	content = content
		.replace( 'declare module erecruit.TsT', 'declare module "tst"' )
		.replace( /}\s*declare module erecruit\.TsT([^\s\{])*\s*\{/g, '' )
		.replace( /TsT\./g, '' );
	fs.writeFileSync( nodeModuleTypings, content, enc );
});

function wrapLibs() {
	var raw = new jake.FileList(); raw.include( fromRoot( "lib/**/*.js" ) ); raw.exclude( fromRoot( "lib/wrapped/**/*" ) );
	var wrapped = raw.toArray().map( ( f ) => ( {
		raw: f,
		wrapped: path.relative( '.', path.resolve( fromRoot( "lib/wrapped" ), path.relative( fromRoot( "lib" ), f ) ) )
	}) );
	wrapped.forEach( w => wrapFile( w.raw, w.wrapped,
		"(function(__root__,module,exports,global,define,require) {",
		"  if ( typeof TypeScript !== 'undefined' ) __root__.TypeScript = TypeScript;\
		 })( typeof global === 'undefined' ? this : global );" ) );

	return wrapped.map( w => w.wrapped );
}

function wrapFile( sourceFile: string, outFile: string, prefix: string, suffix: string ) {
	file( outFile, [sourceFile], () => {
		console.log( "Building " + outFile );
		var enc = { encoding: 'utf8' };
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

		var cmd = typescriptHost + " " + typescriptPath +
			" -removeComments -propagateEnumConstants -noImplicitAny --module commonjs " +
			( disableTypings ? "" : "-declaration " ) +
			sources.join( " " ) +
			( mergeOutput ? ( " -out " + outFile ) : ( " -outDir temp.tmp" ) );

		var ex = jake.createExec( [cmd] );
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
	var ex = jake.createExec( ["node " + jasminePath + " " + path.dirname( testsModule )] );
	ex.addListener( "stdout", ( o: any ) => process.stdout.write( o ) );
	ex.addListener( "stderr", ( e: any ) => process.stderr.write( e ) );
	ex.addListener( "cmdEnd", complete );
	ex.addListener( "error", complete );
	ex.run();	
}

function prepend( prefixFiles: string[], destinationFile: string ) {
	if ( !fs.existsSync( destinationFile ) ) {
		fail( destinationFile + " failed to be created!" );
	}

	var enc = { encoding: 'utf8' };
	var destinationContent = fs.readFileSync( destinationFile, enc );

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
		var enc = { encoding: 'utf8' };
		var contents: string = <any>fs.readFileSync( file, enc );
		var newContents = contents.replace( regex, ( _, prefix, __, suffix ) => prefix + versionValue + suffix );
		fs.writeFileSync( file, newContents, enc );
	}
}

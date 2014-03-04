/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../lib/jake/jake.d.ts" />

var outDir = process.env.outDir || "./bin";
var typescriptPath = process.env.typescriptPath || process.env.tsPath || "./node_modules/typescript/bin/tsc.js";
var typescriptHost = process.env.host || process.env.TYPESCRIPT_HOST || "node";
var jasminePath = "./node_modules/jasmine-focused/bin/jasmine-focused";

import path = require( "path" );
import fs = require( "fs" );

var sourceFiles = ["src/**/*.ts", "lib/**/*.ts"];
var sources = new jake.FileList();
sources.include( sourceFiles );

var tests = new jake.FileList();
tests.include( sourceFiles );
tests.include( ["tests/**/*.ts"] );

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
desc( "Run tests" ); task( 'test', [testsModule], runJasmine, { async: true } );
desc( "Compile tstc" ); task( 'tstc', executableModule );
desc( "Compile NodeJS module" ); task( 'node', [nodeModule, nodeModuleTypings] );
desc( "Compile free module" ); task( 'free', [freeModule, freeModuleTypings] );

compileTs( freeModule, sources.toArray(), lib, /* disableTypings */ false, /* mergeOutput */ true );
compileTs( executableModule, ['node/tstc.ts'], [freeModule], /* disableTypings */ true, /* mergeOutput */ false, /* prereqs */ [typeScriptBaseTypings] );
compileTs( testsModule, tests.toArray(), lib, /* disableTypings */ true, /* mergeOutput */ true );
wrapFile( freeModule, nodeModule, "(function(erecruit){", "})( { TsT: module.exports } );" );
file( typeScriptBaseTypings, ['node/lib.d.ts'], () => jake.cpR( 'node/lib.d.ts', typeScriptBaseTypings ) );

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
	var raw = new jake.FileList(); raw.include( "lib/**/*.js" ); raw.exclude( "lib/wrapped/**/*" );
	var wrapped = raw.toArray().map( ( f ) => ( {
		raw: f,
		wrapped: path.relative( '.', path.resolve( "lib/wrapped", path.relative( "lib", f ) ) )
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
			( mergeOutput ? ( " -out " + outFile ) : (" -outDir temp.tmp") );

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
	return path.relative( '.', path.resolve( outDir, file ) );
}
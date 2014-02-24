/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../lib/jake/jake.d.ts" />

var outDir = process.env.outDir || "./bin";
var typescriptPath = process.env.typescriptPath || process.env.tsPath || "./node_modules/typescript/bin/tsc.js";
var typescriptHost = process.env.host || process.env.TYPESCRIPT_HOST || "node";

import path = require( "path" );
import fs = require( "fs" );

var sources = new jake.FileList();
sources.include( ["src/*.ts", "lib/**/*.ts"] );

var lib = new jake.FileList();
lib.include( "lib/**/*.js" );

var nodeModule = toOutDir( 'tst-node.js' );
var nodeModuleTypings = toOutDir( 'tst-node.d.ts' );
var freeModule = toOutDir( 'tst.js' );
var freeModuleTypings = toOutDir( 'tst.d.ts' );
var executableModule = toOutDir( 'tstc.js' );

desc( "Compile all" );
task( 'default', [nodeModule, nodeModuleTypings, freeModule, freeModuleTypings, executableModule], () => { });

compileTs( freeModule, sources.toArray(), lib.toArray() );
compileTs( executableModule, ['node/tstc.ts'], [freeModule], true );
wrapFile( freeModule, nodeModule, "(function(TsT){", "})( module.exports )" );
wrapFile( freeModuleTypings, nodeModuleTypings, "", "declare module 'tst' { var _: typeof TsT; export = _; }" );

function wrapFile( sourceFile: string, outFile: string, prefix: string, suffix: string ) {
	file( outFile, [sourceFile], () => {
		console.log( "Building " + outFile );
		var enc = { encoding: 'utf8' };
		fs.writeFileSync( outFile, prefix, enc );
		fs.writeFileSync( outFile, fs.readFileSync( sourceFile, enc ), enc );
		fs.appendFileSync( outFile, suffix, enc );
	});
}

function compileTs( outFile: string, sources: string[], prefixes: string[], disableTypings?: boolean ) {
	file( outFile, sources.concat( prefixes ), () => {
		console.log( "Building " + outFile );
		jake.mkdirP( outDir );
		var cmd = typescriptHost + " " + typescriptPath +
			" -removeComments -propagateEnumConstants -noImplicitAny --module commonjs " +
			( disableTypings ? "" : "-declaration " ) +
			sources.join( " " ) + " -out " + outFile;

		var ex = jake.createExec( [cmd] );
		ex.addListener( "stdout", (o: any) => process.stdout.write( o ) );
		ex.addListener( "stderr", (e: any) => process.stderr.write( e ) );
		ex.addListener( "cmdEnd", () => {
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

function prepend( prefixFiles: string[], destinationFile: string ) {
	if ( !fs.existsSync( destinationFile ) ) {
		fail( destinationFile + " failed to be created!" );
	}

	var destinationContent = fs.readFileSync( destinationFile );

	fs.writeFileSync( destinationFile, '', { encoding: 'utf8' });
	prefixFiles
		.filter( f => fs.existsSync( f ) )
		.forEach( f => fs.appendFileSync( destinationFile, fs.readFileSync( f, { encoding: 'utf8' }) ) );

	fs.appendFileSync( destinationFile, destinationContent );
}

function toOutDir( file: string ) {
	return path.relative( '.', path.resolve( outDir, file ) );
}
/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../src/config.ts" />
/// <reference path="../src/emitter.ts" />
/// <reference path="../src/interfaces.ts" />

import fs = require( 'fs' );
import path = require( 'path' );
var args = require( "optimist" )
	.alias( "i", "input" ).describe( "i", "A text file containing the list of input TypeScript files." )
	.demand( "c" ).alias( "c", "config" ).describe( "c", "Configuration file." )
	.argv;

// TODO: need to support config autodiscovery
main();

function main() {
	var files = loadFiles();

	var configPath = args.c;
	var config: erecruit.TsT.Config = eval( "(" + readFile( configPath ) + ")" );
	config.ConfigDir = path.dirname( configPath );
	config.RootDir = path.resolve( config.ConfigDir, config.RootDir || '.' );

	var host: erecruit.TsT.ITsTHost = {
		FetchFile: fileName => fs.existsSync( fileName ) && fs.statSync( fileName ).isFile() ? readFile( fileName ) : null,
		DirectoryExists: path => fs.existsSync( path ) && fs.statSync( path ).isDirectory(),
		GetParentDirectory: name => { var d = path.dirname( name ); return d === name ? null : d; },
		ResolveRelativePath: ( relPath, dir ) => path.resolve( dir, relPath ),
		MakeRelativePath: ( from, to ) => path.relative( from, to ),
		GetIncludedTypingFiles: () => [require.resolve( "./lib.d.ts" )].concat( config.IncludedTypingFiles || [] ) 
	};

	erecruit.TsT.Emit( config, files, host )
		.subscribe( c => {
			var outPath = path.resolve( config.ConfigDir, c.OutputFile );
			console.log( c.SourceFiles.join( ', ' ) + " --> " + path.relative( '.', outPath ) );
			createDir( path.dirname( outPath ) );
			fs.writeFileSync( outPath, c.Content, { encoding: 'utf8' });
		} );
}

function createDir( dir: string ) {
	if ( fs.existsSync( dir ) ) return;
	createDir( path.dirname( dir ) );
	fs.mkdirSync( dir );
}

function readFile( f: string ): string {
	return ( <any>fs ).readFileSync( f, { encoding: "utf8" });
}

function loadFiles() {
	var files: string[] = args._;
	if ( !files || !files.length ) {
		if ( args.i ) {
			files = readFile( args.i ).split( '\n' ).map( s => s.trim() );
		}
	}
	if ( !files || !files.length ) {
		console.error( "No input files specified." );
		process.exit( 1 );
	}

	return files;
}
/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../src/config.ts" />
/// <reference path="../src/emitter.ts" />
/// <reference path="../src/interfaces.ts" />

import fs = require( 'fs' );
import path = require( 'path' );
var args = require( "minimist" )( process.argv.slice( 2 ) );

// TODO: need to support config autodiscovery
main();

function main() {
	var files: string[] = args._;
	var configPath = args.c || args.config;

	if ( !files || !files.length || !configPath ) {
		showUsage();
		process.exit( 1 );
	}


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

function showUsage() {
	console.log( "\
erecruit TsT\r\n\
Version 0.2\r\n\
\r\n\
Usage:    tstc <options> <source-files> \r\n\
See:      https://github.com/erecruit/TsT\r\n\
\r\n\
Options: \r\n\
	-c, --config    Path to config file, .tstconfig\
	" );
}
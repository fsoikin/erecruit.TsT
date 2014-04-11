/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../src/config.ts" />
/// <reference path="../src/emitter.ts" />
/// <reference path="../src/interfaces.ts" />

import fs = require( 'fs' );
import path = require( 'path' );
var args = require( "minimist" )( process.argv.slice( 2 ) );

// TODO: instead of this hack, I should have a log method in ITsTHost
var consoleLog = console.log;
if ( !args.v && !args.verbose ) console.log = () => { };

main();

function main() {
	var files: string[] = args._;
	var configPath = args.c || args.config;

	if ( !files || !files.length || !configPath ) {
		showUsage();
		process.exit( 1 );
	}

	// TODO: need to support config autodiscovery
	var config: erecruit.TsT.Config = eval( "(" + readFile( configPath ) + ")" );
	var configDir = path.dirname( configPath );
	config.RootDir = path.resolve( configDir, config.RootDir || '.' );
	config.ConfigDir = path.relative( config.RootDir, configDir );

	var rootDir = config.RootDir;
	function p( pt: string ) { return path.resolve( rootDir, pt ); }

	var host: erecruit.TsT.ITsTHost = {
		FetchFile: fileName => { fileName = p( fileName ); return fs.existsSync( fileName ) && fs.statSync( fileName ).isFile() ? readFile( fileName ) : null; },
		DirectoryExists: path => { path = p( path ); return fs.existsSync( path ) && fs.statSync( path ).isDirectory() },
		GetParentDirectory: name => { var d = path.dirname( name ); return d === name ? null : d; },
		ResolveRelativePath: ( relPath, dir ) => path.relative( rootDir, path.resolve( p( dir ), relPath ) ),
		MakeRelativePath: ( from, to ) => path.relative( p( from ), p( to ) ),
		GetIncludedTypingFiles: () => [require.resolve( "./lib.d.ts" )].concat( config.IncludedTypingFiles || [] ) 
	};

	erecruit.TsT.Emit( config, files.map( f => path.relative( rootDir, f ) ), host )
		.subscribe( c => {
			var outPath = path.resolve( config.RootDir, c.OutputFile );
			consoleLog( c.SourceFiles.map( f => path.relative( '.', path.resolve( config.RootDir, f ) ) ).join( ', ' ) + " --> " + path.relative( '.', path.relative( '.', outPath ) ) );
			createDir( path.dirname( outPath ) );
			fs.writeFileSync( outPath, c.Content, { encoding: 'utf8' });
		} );


	function showUsage() {
		consoleLog( "\
erecruit TsTranslator\r\n\
Version 0.3\r\n\
\r\n\
Usage:    tstc <options> <source-files> \r\n\
See:      https://github.com/erecruit/TsT\r\n\
\r\n\
Options: \r\n\
	-c, --config    Path to config file, .tstconfig\r\n\
	-v, --verbose   Display diagnostic output\
	" );
	}
}

function createDir( dir: string ) {
	if ( fs.existsSync( dir ) ) return;
	createDir( path.dirname( dir ) );
	fs.mkdirSync( dir );
}

function readFile( f: string ): string {
	return ( <any>fs ).readFileSync( f, { encoding: "utf8" });
}
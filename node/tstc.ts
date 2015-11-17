/// <reference path="../lib/node/node.d.ts" />
/// <reference path="../src/config.ts" />
/// <reference path="../src/emitter.ts" />
/// <reference path="../src/interfaces.ts" />
/// <reference path="../src/version.ts" />

import fs = require( 'fs' );
import path = require( 'path' );
var args = require( "minimist" )( process.argv.slice( 2 ) );

// TODO: instead of this hack, I should have a log method in ITsTHost
var consoleLog = console.log;
if ( !args.v && !args.verbose ) console.log = () => { };
if ( args.d || args.debug ) console.debug = consoleLog;

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
	function p(pt: string) { return path.resolve(rootDir, pt); }

	files = files.map(f => path.relative(rootDir, f));

	var host: erecruit.TsT.ITsTHost = {
		FetchFile: fileName => {
			fileName = p(fileName);
			if (fs.existsSync(fileName) && fs.statSync(fileName).isFile()) return readFile(fileName);
			console.debug( `Couldn't find file '${fileName}', returning null` );
			return null;
		},
		DirectoryExists: path => { path = p( path ); return fs.existsSync( path ) && fs.statSync( path ).isDirectory() },
		GetParentDirectory: name => { var d = path.dirname( name ); return d === name ? null : d; },
		ResolveRelativePath: ( relPath, dir ) => path.relative( rootDir, path.resolve( p( dir ), relPath ) ),
		MakeRelativePath: ( from, to ) => path.relative( p( from ), p( to ) ),
		GetIncludedTypingFiles: () => [require.resolve( "./lib.d.ts" )].concat( config.IncludedTypingFiles || [] ) 
	};

	try {
		erecruit.TsT.Emit(config, files, host)
			.forEach( c => {
				var outPath = path.resolve( rootDir, c.OutputFile );
				consoleLog( c.SourceFiles.map( f => path.relative( '.', path.resolve( rootDir, f ) ) ).join( ', ' ) + " --> " + path.relative( '.', outPath ) );
				createDir( path.dirname( outPath ) );
				fs.writeFileSync( outPath, c.Content, { encoding: 'utf8' });
			});
	}
	catch ( ex ) {
		console.error( ex );
	}


	function showUsage() {
		consoleLog( "\
erecruit TsTranslator\r\n\
Version " + erecruit.TsT.Version + "\r\n\
\r\n\
Usage:    tstc <options> <source-files> \r\n\
See:      https://github.com/erecruit/TsT\r\n\
\r\n\
Options: \r\n\
	-c, --config    Path to config file, .tstconfig.\r\n\
	-v, --verbose   Display diagnostic output.\r\n\
	-d, --debug     Display debug output.\
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
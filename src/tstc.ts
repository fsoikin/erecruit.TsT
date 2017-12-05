/// <reference path="../typings/globals/node/index.d.ts" />
import * as fs from 'fs'
import * as path from 'path'
import * as minimist from 'minimist'
import { Config } from './config'
import { ITsTHost } from './interfaces'
import { Emit } from './emitter'
import Version from './version'
import { log, debug, enableDebug, suppressOutput } from './utils'
require( "./node-adaptor" ); // Bind .txt extension to "read file"

var args = <any>minimist( process.argv.slice( 2 ) );

if ( !args.v && !args.verbose ) suppressOutput();
if ( args.d || args.debug ) enableDebug();

main();

function main() {
	var files: string[] = args._;
	var configPath = args.c || args.config;

	if ( !files || !files.length || !configPath ) {
		showUsage();
		process.exit( 1 );
	}

	// TODO: need to support config autodiscovery
	var config: Config = eval( "(" + readFile( configPath ) + ")" );
	var configDir = path.dirname( configPath );
	config.RootDir = path.resolve( configDir, config.RootDir || '.' );
	config.ConfigDir = path.relative( config.RootDir, configDir );

	var rootDir = config.RootDir;
	function p(pt: string) { return path.resolve(rootDir, pt); }

	files = files.map(f => path.relative(rootDir, f));

	var host: ITsTHost = {
		FetchFile: fileName => {
			if ( fileName === "lib.d.ts" ) return require("./lib/libdts.txt");
			else {
				fileName = p(fileName);
				if (fs.existsSync(fileName) && fs.statSync(fileName).isFile()) return readFile(fileName);
			}
			debug( () => `Couldn't find file '${fileName}', returning null` );
			return null;
		},
		DirectoryExists: path => { path = p( path ); return fs.existsSync( path ) && fs.statSync( path ).isDirectory() },
		GetParentDirectory: name => { var d = path.dirname( name ); return d === name ? null : d; },
		ResolveRelativePath: ( relPath, dir ) => path.relative( rootDir, path.resolve( p( dir ), relPath ) ),
		MakeRelativePath: ( from, to ) => path.relative( p( from ), p( to ) ),
		GetIncludedTypingFiles: () => ["lib.d.ts"].concat( config.IncludedTypingFiles || [] ) 
	};

	try {
		Emit(config, files, host)
			.forEach( c => {
				var outPath = path.resolve( rootDir, c.OutputFile );
				console.log( c.SourceFiles.map( f => path.relative( '.', path.resolve( rootDir, f ) ) ).join( ', ' ) + " --> " + path.relative( '.', outPath ) );
				createDir( path.dirname( outPath ) );
				fs.writeFileSync( outPath, c.Content, { encoding: 'utf8' });
			});
	}
	catch ( ex ) {
		console.error( ex );
	}


	function showUsage() {
		console.log( "\
erecruit TsTranslator\r\n\
Version " + Version + "\r\n\
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
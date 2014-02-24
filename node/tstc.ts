/// <reference path="../src/emitter.ts" />
/// <reference path="../lib/node/node.d.ts" />

import fs = require( 'fs' );
import path = require( 'path' );
var args = require( "optimist" )
	.alias( "i", "input" ).describe( "i", "A text file containing the list of input TypeScript files." )
	.demand( "c" ).alias( "c", "config" ).describe( "c", "Configuration file." )
	.argv;

main();

function main() {
	var files = loadFiles();

	var host: TsT.ITsTHost = {
		FetchFile: fileName => fs.existsSync( fileName ) && fs.statSync( fileName ).isFile() ? readFile( fileName ) : null,
		DirectoryExists: path => fs.existsSync( path ) && fs.statSync( path ).isDirectory(),
		GetParentDirectory: name => { var d = path.dirname( name ); return d === name ? null : d; },
		ResolveRelativePath: ( relPath, dir ) => path.resolve( dir, relPath )
	};

	var configPath = args.c;
	var config: TsT.Config = eval( "(" + readFile( configPath ) + ")" );
	config.RootDir = config.RootDir ? path.resolve( path.dirname( configPath ), config.RootDir ) : path.dirname( configPath );

	var tstFiles = files.map( f => <TsT.File>{
		FullPath: f.replace( '\\', '/' ),
		Directory: path.dirname( f ).replace( '\\', '/' ),
		RelativeDir: path.relative( config.RootDir, path.dirname( f ) ).replace( '\\', '/' ),
		Name: path.basename( f ),
		NameWithoutExtension: path.basename( f, path.extname( f ) ),
		Extension: ( path.extname( f ) || ' ' ).substring( 1 )
	});

	TsT.Emit( config, tstFiles, host )
		.subscribe( c => console.log( c.File.FullPath + ":\r\n\t" + c.Content ) );
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
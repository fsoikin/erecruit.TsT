import { Template } from 'nunjucks'
import { Config, CachedConfigPart, cacheConfig, getFileConfigTypes, getFileConfigClasses } from './config'
import { ITsTHost } from './interfaces'
import { linq, log, objName, debug } from './utils'
import * as Enumerable from 'linq-es2015'
import { createExtractor } from './extractor'

export interface FileContent {
	OutputFile: string;
	Content: string;
	SourceFiles: string[];
}

/**
 * Processes a bunch of input files and outputs resulting text according to given config.
 * @param cfg Config to use.
 * @param files List of files to process. The paths must be relative to the provided host.
 * @param host Abstraction of the environment - mostly file IO operations.
 */
export function Emit( cfg: Config, files: string[], host: ITsTHost ): FileContent[] {
	let config = cacheConfig(host, cfg);
	files = (files || []).map(f => host.MakeRelativePath(".", f)); // This MakeRelative call will "normalize" file names - remove leading dots and whatnot.
	let extractor = createExtractor(config, files);
	log( () => "Emit: config = " + JSON.stringify( cfg ) );

	return linq( files )
		.SelectMany( f =>
			formatTemplate( f, extractor.GetDocument( f ).Types, getFileConfigTypes( config, f ), objName ).Concat(
			formatTemplate( f, extractor.GetDocument( f ).Classes, getFileConfigClasses( config, f ), objName ) ),
			(f, x) => ({ outputFile: x.outputFileName, content: x.content, inputFile: f }) )
		.Select( x => { log( () => "Emit: Finished generation: " + x.outputFile ); return x; } )
		.GroupBy( x => x.outputFile, x => x,
			(file, content) => <FileContent>{
				OutputFile: host.ResolveRelativePath( file, cfg.RootDir ), // Calculate output path relative to host.
				Content: linq( content ).Select( k => k.content ).ToArray().join( '\r\n' ),
				SourceFiles: linq( content ).Select( k => k.inputFile ).Distinct().ToArray()
			}
		)
		.Select(f => { debug(() => `Emit: returninig ${f.SourceFiles.join()} -> ${f.OutputFile}`); return f; } )
		.ToArray();

	function formatTemplate<TObject>( sourceFileName: string, objects: TObject[], config: CachedConfigPart[], objectName: ( o: TObject ) => string )
		: Enumerable.Enumerable<{ outputFileName: string; content: string }> {

		return linq( config )
			.Where( cfg => !!( cfg.template && cfg.fileName ) )
			.SelectMany( _ => objects || [], ( cfg, obj ) => ( { cfg: cfg, obj: obj }) )
			.Where( x => x.cfg.match( objectName( x.obj ) ) )
			.Select( x => ( {
				outputFileName: formatFileName( sourceFileName, x.cfg.fileName ),
				content: x.cfg.template.render( x.obj )
			}) );
	}

	function formatFileName( sourceFileName: string, template: Template ) {

		// On input, sourceFileName is relative to host
		// But for purposes of templating, we need to make it relative to cfg.RootDir
		sourceFileName = host.MakeRelativePath(cfg.RootDir, sourceFileName);
		var dir = host.GetParentDirectory( sourceFileName );
		if ( dir && dir[dir.length - 1] !== '/' && dir[dir.length - 1] !== '\\' ) dir += '/';

		var name = dir && sourceFileName.substr( 0, dir.length-1 ) === dir.substring( 0, dir.length-1 )
			? sourceFileName.substring( dir.length )
			: sourceFileName;
		var nameParts = name.split( '.' );

		var model = {
			Path: dir || '',
			Name: nameParts.slice( 0, nameParts.length - 1 ).join( '.' ),
			Extension: nameParts[nameParts.length - 1]
		};

		debug( () => "formatFileName: model = " + JSON.stringify( model ) );
		return template.render( model );
	}
}
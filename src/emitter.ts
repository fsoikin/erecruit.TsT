/// <reference path="../lib/nunjucks/nunjucks.d.ts" />
/// <reference path="../lib/rx/rx.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="extractor.ts" />
/// <reference path="config.ts" />
/// <reference path="utils.ts" />
/// <reference path="filters/general.ts" />
/// <reference path="filters/csharp.ts" />

module erecruit.TsT {
	export interface FileContent {
		OutputFile: string;
		Content: string;
		SourceFiles: string[];
	}

	export function Emit( cfg: Config, files: string[], host: ITsTHost ): FileContent[] {
		var config = cacheConfig( host, cfg );
		var e = new Extractor( config );
		log( () => "Emit: config = " + JSON.stringify( cfg ) );

		files = ensureArray( files );
		e.LoadDocuments( files );

		return Enumerable.from( files )
			.selectMany(
				f =>
					formatTemplate( f, e.GetDocument( f ).Types, getFileConfigTypes( config, f ), objName ).concat(
					formatTemplate( f, e.GetDocument( f ).Classes, getFileConfigClasses( config, f ), objName ) ),
				( f, x ) => ( { outputFile: x.outputFileName, content: x.content, inputFile: f }) )
			.doAction( x => log( () => "Finished generation: " + x.outputFile ) )
			.groupBy( x => x.outputFile, x => x,
				( file, content ) => <FileContent>{
					OutputFile: config.Host.ResolveRelativePath( file, config.Original.RootDir ),
					Content: content.select( k => k.content ).toArray().join( '\r\n' ),
					SourceFiles: Enumerable
						.from( content )
						.select( k => config.Host.ResolveRelativePath( k.inputFile, config.Original.RootDir ) )
						.distinct()
						.toArray()
				}
			)
			.toArray();

		function formatTemplate<TObject>( sourceFileName: string, objects: TObject[], config: CachedConfigPart[], objectName: ( o: TObject ) => string )
			: linqjs.IEnumerable<{ outputFileName: string; content: string }> {

			return Enumerable.from( config )
				.where( cfg => !!( cfg.template && cfg.fileName ) )
				.selectMany( _ => objects, ( cfg, obj ) => ( { cfg: cfg, obj: obj }) )
				.where( x => x.cfg.match( objectName( x.obj ) ) )
				.select( x => ( {
					outputFileName: formatFileName( sourceFileName, x.cfg.fileName ),
					content: x.cfg.template.render( x.obj )
				}) );
		}

		function formatFileName( sourceFileName: string, template: Nunjucks.ITemplate ) {

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

			log( () => "formatFileName: model = " + JSON.stringify( model ) );
			return template.render( model );
		}
	}
}
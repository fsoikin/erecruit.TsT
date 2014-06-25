/// <reference path="../lib/rx/rx.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="extractor.ts" />
/// <reference path="config.ts" />
/// <reference path="dust-bootstrap.ts" />
/// <reference path="utils.ts" />

module erecruit.TsT {
	export module Config {
		var configDustContextKey = "{18EEB707-DE72-499F-B9BE-F584A368EBB7}";

		export function fromDustContext( context: dust.Context ): CachedConfig {
			return context.get( configDustContextKey );
		}
		export function toDustContext( config: CachedConfig ) {
			var c: any = {}; c[configDustContextKey] = config;
			return dust.makeBase( c );
		}
	}

	export interface FileContent {
		OutputFile: string;
		Content: string;
		SourceFiles: string[];
	}

	export function Emit( cfg: Config, files: string[], host: ITsTHost ): Rx.IObservable<FileContent> {
		// TODO: this is really a hole in dustjs design. What if some other component also uses dustjs and wants a different implementation of onLoad?
		// See https://github.com/linkedin/dustjs/issues/452
		dust.onLoad = ( name, cb ) => {
			try {
				if ( name.indexOf( '.' ) < 0 ) name += ".tpl";
				log( () => "Emit: fetching " + name );
				var content = host.FetchFile( host.ResolveRelativePath( name, host.ResolveRelativePath( cfg.ConfigDir, cfg.RootDir ) ) );
				cb( content ? undefined : "Cannot read " + name, content || undefined );
			}
			catch ( err ) { cb( err ); }
		};

		var config = cacheConfig( host, cfg );
		var e = new Extractor( config );
		log( () => "Emit: config = " + JSON.stringify( cfg ) );

		files = ensureArray( files );
		e.LoadDocuments( files );

		return Rx.Observable
			.fromArray( files )
			.selectMany(
				f =>
					formatTemplate( f, e.GetDocument( f ).Types, getFileConfigTypes( config, f ), Config.toDustContext( config ), objName ).concat(
					formatTemplate( f, e.GetDocument( f ).Classes, getFileConfigClasses( config, f ), Config.toDustContext( config ), objName ) ),
				(f, x) => ( { outputFile: x.outputFileName, content: x.content, inputFile: f }) )
			.doAction( x => log( () => "Finished generation: " + x.outputFile ) )
			.groupBy( x => x.outputFile, x => x )
			.selectMany(
				x => x.takeLastBuffer( Number.MAX_VALUE ),
				(x, xs) => <FileContent>{
					OutputFile: config.Host.ResolveRelativePath( x.key, config.Original.RootDir ),
					Content: xs.map( k => k.content ).join( '\r\n' ),
					SourceFiles: Enumerable
						.from( xs )
						.select( k => config.Host.ResolveRelativePath( k.inputFile, config.Original.RootDir ) )
						.distinct()
						.toArray()
				});

		function formatTemplate<TObject>( sourceFileName: string, objects: TObject[], config: CachedConfigPart[], baseCtx: dust.Context, objectName: ( o: TObject ) => string )
			: Rx.IObservable<{ outputFileName: string; content: string }> {

			log( () => "formatTemplate: Objects: " + JSON.stringify( objects.map( x=> (<any>x).Name ) ) );
			log( () => "formatTemplate: Config: " + JSON.stringify( config ) );

			return Rx.Observable
				.fromArray( config )
				.select( cfg => !cfg.template || !cfg.fileName ? null :
					Enumerable
					.from( objects )
					.where( obj => cfg.match( objectName( obj ) ) )
					.select( obj =>
						callDustJs( cfg.template, baseCtx.push( obj ) )
						.zip( formatFileName( sourceFileName, cfg.fileName ),
							( content, fileName ) => ( { outputFileName: fileName, content: content }) )
						.take(1)
					)
				)
				.where( e => !!e )
				.selectMany( oos => Rx.Observable.merge( oos.where( e => !!e ).toArray() ) );
		}

		function formatFileName( sourceFileName: string, template: dust.SimpleRenderFn ) {

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
			return callDustJs( template, dust.makeBase( model ) );
		}

		function callDustJs( template: dust.SimpleRenderFn, ctx: dust.Context ) {
			return Rx.Observable.create<string>( or => {
				template( ctx, ( err, out ) => {
					err ? or.onError( err ) : or.onNext( out );
					or.onCompleted();
				});
				return () => { };
			});
		}
	}
}
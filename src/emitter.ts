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
		var config = cacheConfig( host, cfg );
		var e = new Extractor( config );

		return Rx.Observable
			.fromArray( ensureArray( files ) )
			.selectMany(
				f => formatTemplate( f, e.GetModule( f ).Types, getFileConfig( config, f ), Config.toDustContext( config ), typeName ),
				(f, x) => ( { outputFile: x.outputFileName, content: x.content, inputFile: f }) )
			.groupBy( x => x.outputFile, x => x )
			.selectMany(
				x => x.takeLastBuffer( Number.MAX_VALUE ),
				(x, xs) => <FileContent>{
					OutputFile: x.key,
					SourceFiles: Enumerable.from( xs ).select( k => k.inputFile ).distinct().toArray(), 
					Content: xs.map( k => k.content ).join( '\r\n' )
				});

		function formatTemplate<TObject>( sourceFileName: string, objects: TObject[], config: CachedConfigPart[], baseCtx: dust.Context, objectName: ( o: TObject ) => string )
			: Rx.IObservable<{ outputFileName: string; content: string }> {

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

		function formatFileName( sourceFileName: string, template: dust.RenderFn ) {
			var dir = host.GetParentDirectory( sourceFileName );
			var name = sourceFileName.substring( dir.length + ( (dir[dir.length-1] === '/' || dir[dir.length-1] === '\\') ? 0 : 1) );
			var nameParts = name.split( '.' );

			var model = {
				Path: host.MakeRelativePath( config.Original.RootDir || "", dir ),
				Name: nameParts.slice( 0, nameParts.length - 1 ).join( '.' ),
				Extension: nameParts[nameParts.length - 1]
			};

			return callDustJs( template, dust.makeBase( model ) );
		}

		function callDustJs( template: dust.RenderFn, ctx: dust.Context ) {
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
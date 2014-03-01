/// <reference path="../lib/rx/rx.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="extractor.ts" />
/// <reference path="config.ts" />
/// <reference path="dust-bootstrap.ts" />

module erecruit.TsT {
	export module Config {
		var configDustContextKey = "{18EEB707-DE72-499F-B9BE-F584A368EBB7}";

		export function fromDustContext( context: dust.Context ): CachedConfig {
			return context.get( configDustContextKey );
		}
		export function toDustContext( config: CachedConfig ) {
			var c = {}; c[configDustContextKey] = config;
			return dust.makeBase( c );
		}
	}

	export interface FileContent {
		File: string;
		Content: string;
	}

	export function Emit( cfg: Config, files: string[], host: ITsTHost ): Rx.IObservable<FileContent> {
		var config = cacheConfig( host, cfg );
		var e = new Extractor( host );

		return Rx.Observable
			.fromArray( files )
			.selectMany( f => {
				var fileConfig = getFileConfig( config, f );
				var mod = e.GetModule( f );
				var ctx = Config.toDustContext( config );
				var classes = formatTemplate( mod.Classes, fileConfig.Class, ctx, c => c.Name );
				var types = formatTemplate( mod.Types, fileConfig.Type, ctx, typeName );
				return classes.merge( types )
					.takeLastBuffer( Number.MAX_VALUE )
					.select( xs => <FileContent>{
						File: f,
						Content: xs.join( '\r\n' )
					});
			});

		function formatTemplate<TObject>( objects: TObject[], config: CachedConfigPart[], baseCtx: dust.Context, objectName: ( o: TObject ) => string )
			: Rx.IObservable<string> {
			return Rx.Observable
				.fromArray( config )
				.select( cfg => Enumerable
					.from( objects )
					.where( obj => cfg.match( objectName( obj ) ) )
					.select( obj => Rx.Observable.create<string>( or => {
						cfg.template( baseCtx.push( obj ), ( err, out ) => err ? or.onError( err ) : ( or.onNext( out ), or.onCompleted() ) );
						return () => { };
					}) )
				)
				.selectMany( oos => Rx.Observable.merge( oos.toArray() ) );
		}
	}
}
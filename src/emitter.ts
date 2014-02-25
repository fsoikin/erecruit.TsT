/// <reference path="../lib/rx/rx.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="./dust-bootstrap.ts" />
/// <reference path="./extractor.ts" />
/// <reference path="./interfaces.ts" />
/// <reference path="./config.ts" />

module TsT {
	export interface File {
		FullPath: string;
		Directory: string;
		RelativeDir: string;
		Name: string;
		NameWithoutExtension: string;
		Extension: string;
	}

	export interface FileContent {
		File: File;
		Content: string;
	}

	export function Emit( cfg: Config, files: File[], host: ITsTHost ): Rx.IObservable<FileContent> {
		var config = cacheConfig( cfg,
			tpl => !tpl ? null :
				dust.compileFn( tpl[0] == '@' ? host.FetchFile( host.ResolveRelativePath( tpl.substring( 1 ), cfg.ConfigDir ) ) : tpl ) );
		var e = new Extractor( host );

		return Rx.Observable
			.fromArray( files )
			.selectMany( f => {
				var fileConfig = getFileConfig( config, f.FullPath );
				var mod = e.GetModule( f.FullPath );
				var ctx = dust.makeBase( { File: f });
				var classes = formatTemplate( mod.Classes, fileConfig.Class, ctx, c => c.Name );
				var types = formatTemplate( mod.Types, fileConfig.Type, ctx, typeName );
				return classes.merge( types )
					.takeLastBuffer( Number.MAX_VALUE )
					.select( xs => <FileContent>{
						File: f,
						Content: xs.join( '\r\n' )
					});
			});

		function formatTemplate<TObject>( objects: TObject[], config: CachedConfigPart<dust.RenderFn>[], baseCtx: dust.Context, objectName: ( o: TObject ) => string )
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
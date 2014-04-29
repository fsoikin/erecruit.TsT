/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="interfaces.ts" />

module erecruit.TsT {
	export interface ConfigPart {
		[regex: string]: { FileName: string; Template: string; };
	}

	export interface FileConfig {
		Class?: ConfigPart;
		Types?: ConfigPart;
	}

	export interface Config extends FileConfig {
		RootDir?: string;
		ConfigDir?: string;
		IncludedTypingFiles?: string[];
		Files?: { [regex: string]: FileConfig };
	}

	export interface CachedConfigPart {
		match: ( name: string ) => boolean;
		fileName: dust.SimpleRenderFn;
		template: dust.SimpleRenderFn;
	}

	export interface CachedConfig {
		Original: Config;
		Host: ITsTHost;
		File: {
			match: ( fileName: string ) => boolean;
			types: CachedConfigPart[];
		}[];
	}

	export function getFileConfig( config: CachedConfig, fileName: string ) {
		return Enumerable
			.from( config.File )
			.where( c => c.match( fileName ) )
			.aggregate( <CachedConfigPart[]>[], ( a, b ) => ( a || [] ).concat( b.types || [] ) );
	}

	export function cacheConfig( host: ITsTHost, config: Config ): CachedConfig {
		return {
			Original: config,
			Host: host,
			File: Enumerable
				.from( config.Files )
				.concat( [{ key: '.', value: <FileConfig>config }] )
				.where( x => !!x.key )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						match: ( fileName: string ) => { var res = regex.test( fileName ); regex.test( '' ); return res; },
						types: (x.value && cacheConfigPart( config, host, x.value.Types )) || []
					};
				})
				.toArray()
		};

		function cacheConfigPart( cfg: Config, host: ITsTHost, c: ConfigPart ): CachedConfigPart[] {
			return Enumerable.from( c )
				.where( c => !!c.key )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						match: ( name: string ) => { var res = regex.test( name ); regex.test( '' ); return res; },
						fileName: x.value && compileTemplate( x.value.FileName, cfg ),
						template: x.value && compileTemplate( x.value.Template, cfg )
					};
				})
				.toArray();
		}

		function compileTemplate( tpl: string, cfg: Config ) {
			log( () => "compileTemplate: " + tpl );

			if ( tpl && tpl[0] === '@' ) {
				var file = host.ResolveRelativePath( tpl.substring( 1 ), host.ResolveRelativePath( cfg.ConfigDir, cfg.RootDir ) );
				tpl = host.FetchFile( file );
				if ( !tpl ) throw "Unable to load template from " + file;
			}

			return ( tpl && dust.compileFn( tpl ) ) || (( ctx: dust.Context, cb: dust.Callback ) => cb( null, "" ));
		}
	}
}
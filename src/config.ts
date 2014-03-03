/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="interfaces.ts" />

module erecruit.TsT {
	export interface ConfigPart {
		[regex: string]: string
	}

	export interface FileConfig {
		Class?: ConfigPart;
		Type?: ConfigPart;
	}

	export interface Config extends FileConfig {
		Extension?: string;
		RootDir?: string;
		ConfigDir?: string;
		IncludedTypingFiles?: string[];
		File?: { [regex: string]: FileConfig };
	}

	export interface CachedConfigPart {
		match: ( name: string ) => boolean;
		template: dust.RenderFn;
	}

	export interface CachedFileConfig {
		Class: CachedConfigPart[];
		Type: CachedConfigPart[];
	}

	export interface CachedConfig {
		Original: Config;
		Host: ITsTHost;
		File: {
			match: ( fileName: string ) => boolean;
			config: CachedFileConfig;
		}[];
	}

	export function getFileConfig( config: CachedConfig, fileName: string ) {
		return Enumerable
			.from( config.File )
			.where( c => c.match( fileName ) )
			.aggregate( <CachedFileConfig>{}, ( a, b ) => ( {
				Class: ( a.Class || [] ).concat( b.config.Class || [] ),
				Type: ( a.Type || [] ).concat( b.config.Type || [] )
			}) );
	}

	export function cacheConfig( host: ITsTHost, config: Config ): CachedConfig {
		return {
			Original: config,
			Host: host,
			File: Enumerable
				.from( config.File )
				.concat( [{ key: '.', value: <FileConfig>config }] )
				.where( x => !!x.key && !!x.value )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						match: ( fileName: string ) => { var res = regex.test( fileName ); regex.test( '' ); return res; },
						config: cacheConfig( config, host, x.value )
					};
				})
				.toArray()
		};

		function cacheConfigPart( cfg: Config, host: ITsTHost, c: ConfigPart ): CachedConfigPart[] {
			return Enumerable.from( c ).where( c => !!c.key && !!c.value )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						match: ( name: string ) => { var res = regex.test( name ); regex.test( '' ); return res; },
						template: !x.value ? null :
						dust.compileFn( x.value[0] == '@' ? host.FetchFile( host.ResolveRelativePath( x.value.substring( 1 ), cfg.ConfigDir ) ) : x.value )
					};
				})
				.toArray();
		}

		function cacheConfig( cfg: Config, host: ITsTHost, c: FileConfig ): CachedFileConfig {
			return { Class: cacheConfigPart( cfg, host, c.Class ), Type: cacheConfigPart( cfg, host, c.Type ) };
		}
	}
}
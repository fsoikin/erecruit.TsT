/// <reference path="../lib/linq/linq.d.ts" />

module TsT {
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
		File?: { [regex: string]: FileConfig };
	}

	export interface CachedConfigPart<TTemplate> {
		match: ( name: string ) => boolean;
		template: TTemplate;
	}

	export interface CachedFileConfig<TTemplate> {
		Class: CachedConfigPart<TTemplate>[];
		Type: CachedConfigPart<TTemplate>[];
	}

	export interface CachedConfig<TTemplate> {
		Original: Config;
		File: {
			match: ( fileName: string ) => boolean;
			config: CachedFileConfig<TTemplate>;
		}[];
	}

	export function getFileConfig<TTemplate>( config: CachedConfig<TTemplate>, fileName: string ) {
		return Enumerable
			.from( config.File )
			.where( c => c.match( fileName ) )
			.aggregate( <CachedFileConfig<TTemplate>>{}, ( a, b ) => ( {
				Class: ( a.Class || [] ).concat( b.config.Class || [] ),
				Type: ( a.Type || [] ).concat( b.config.Type || [] )
			}) );
	}

	export function cacheConfig<TTemplate>( config: Config, resolveTemplate: ( str: string ) => TTemplate ): CachedConfig<TTemplate> {
		return {
			Original: config,
			File: Enumerable
				.from( config.File )
				.concat( [{ key: '.', value: <FileConfig>config }] )
				.where( x => !!x.key && !!x.value )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						match: ( fileName: string ) => { var res = regex.test( fileName ); regex.test( '' ); return res; },
						config: cacheConfig( x.value )
					};
				})
				.toArray()
		};

		function cacheConfigPart( c: ConfigPart ): CachedConfigPart<TTemplate>[] {
			return Enumerable.from( c ).where( c => !!c.key && !!c.value )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						match: ( name: string ) => { var res = regex.test( name ); regex.test( '' ); return res; },
						template: resolveTemplate( x.value )
					};
				})
				.toArray();
		}

		function cacheConfig( c: FileConfig ): CachedFileConfig<TTemplate> {
			return { Class: cacheConfigPart( c.Class ), Type: cacheConfigPart( c.Type ) };
		}
	}
}
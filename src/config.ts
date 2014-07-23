/// <reference path="../lib/nunjucks/nunjucks.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />

module erecruit.TsT {
	export interface ConfigPart {
		[regex: string]: { FileName: string; Template: string; };
	}

	export interface FileConfig {
		Classes?: ConfigPart;
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
		fileName: Nunjucks.ITemplate;
		template: Nunjucks.ITemplate;
	}

	export interface CachedFileConfig {
		Match: ( fileName: string ) => boolean;
		Types: CachedConfigPart[];
		Classes: CachedConfigPart[];
	}

	export interface CachedConfig {
		Original: Config;
		Host: ITsTHost;
		File: CachedFileConfig[];
		NunjucksEnv: Nunjucks.IEnvironment;
	}

	export function getFileConfigTypes( config: CachedConfig, fileName: string ) {
		return getFileConfig( config, fileName, b => b.Types );
	}

	export function getFileConfigClasses( config: CachedConfig, fileName: string ) {
		return getFileConfig( config, fileName, b => b.Classes );
	}

	function getFileConfig( config: CachedConfig, fileName: string, getParts: ( c: CachedFileConfig ) => CachedConfigPart[] ) {
		return Enumerable
			.from( config.File )
			.where( c => c.Match( fileName ) )
			.aggregate( <CachedConfigPart[]>[], ( a, b ) => ( a || [] ).concat( getParts( b ) || [] ) );
	}

	export function cacheConfig( host: ITsTHost, config: Config ): CachedConfig {
		var env = new nunjucks.Environment( [createLoader()] );
		env.addExtension( "DummyTagExtension", new DummyTagExtension() );

		var res = {
			Original: config,
			Host: host,
			NunjucksEnv: env,
			File: Enumerable
				.from( config.Files )
				.concat( [{ key: '.', value: <FileConfig>config }] )
				.where( x => !!x.key )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						Match: ( fileName: string ) => { var res = regex.test( fileName ); regex.test( '' ); return res; },
						Types: ( x.value && cacheConfigPart( x.value.Types ) ) || [],
						Classes: ( x.value && cacheConfigPart( x.value.Classes ) ) || []
					};
				})
				.toArray()
		};

		// TODO: make custom filters extensible
		addFilters( markupFilters( res ) )
		addFilters( CSharp.markupFilters( res ) );

		return res;

		function addFilters( fs: { [key: string]: Function }) {
			for ( var f in fs ) env.addFilter( f, fs[f] );
		}

		function cacheConfigPart( c: ConfigPart ): CachedConfigPart[] {
			return Enumerable.from( c )
				.where( c => !!c.key )
				.select( x => {
					var regex = new RegExp( x.key );
					return {
						match: ( name: string ) => { var res = regex.test( name ); regex.test( '' ); return res; },
						fileName: x.value ? getTemplate( x.value.FileName ) : null,
						template: x.value ? getTemplate( x.value.Template ) : null
					};
				})
				.toArray();
		}

		function getTemplate( tpl: string ) {
			log( () => "getTemplate: " + tpl );

			if ( tpl && tpl[0] === '@' ) {
				var file = host.ResolveRelativePath( tpl.substring( 1 ), host.ResolveRelativePath( config.ConfigDir, config.RootDir ) );
				tpl = host.FetchFile( file );
				if ( !tpl ) throw "Unable to load template from " + file;
			}

			return new nunjucks.Template( tpl, env, file );
		}

		function createLoader() {
			return {
				getSource: ( name: string ) => {
					var path = host.ResolveRelativePath( name, config.RootDir );
					var src = host.FetchFile( path );
					if ( src === null || src === undefined ) throw new Error( "External template " + name + " could not be loaded (tried to look at " + path + ")." );
					return { src: src, path: path };
				}
			};
		}
	}
}
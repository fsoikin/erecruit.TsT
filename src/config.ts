import { Template, Environment, ILoader } from 'nunjucks'
import { ITsTHost } from './interfaces'
import * as CSharp from './filters/csharp'
import * as FSharp from './filters/fsharp'
import { DummyTagExtension, markupFilters } from './filters/general'
import { log } from './utils'

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
	fileName: Template;
	template: Template;
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
	NunjucksEnv: Environment;
}

export function getFileConfigTypes( config: CachedConfig, fileName: string ) {
	return getFileConfig( config, fileName, b => b.Types );
}

export function getFileConfigClasses( config: CachedConfig, fileName: string ) {
	return getFileConfig( config, fileName, b => b.Classes );
}

function getFileConfig( config: CachedConfig, fileName: string, getParts: ( c: CachedFileConfig ) => CachedConfigPart[] ) {
	return ( config.File || [] )
		.filter( c => c.Match( fileName ) )
		.reduce( 
			( a, b ) => ( a || [] ).concat( getParts( b ) || [] ),
			<CachedConfigPart[]>[] );
}

export function cacheConfig( host: ITsTHost, config: Config ): CachedConfig {
	var env = new Environment( createLoader() );
	env.addExtension( "DummyTagExtension", new DummyTagExtension() );

	var res = {
		Original: config,
		Host: host,
		NunjucksEnv: env,
		File: Object.keys( config.Files || {} )
			.map( k => ({ key: k, value: config.Files[k] }) )
			.concat( [{ key: '.', value: <FileConfig>config }] )
			.filter( x => !!x.key )
			.map( x => {
				var regex = new RegExp( x.key );
				return {
					Match: ( fileName: string ) => { var res = regex.test( fileName ); regex.test( '' ); return res; },
					Types: ( x.value && cacheConfigPart( x.value.Types ) ) || [],
					Classes: ( x.value && cacheConfigPart( x.value.Classes ) ) || []
				};
			})
	};

	// TODO: make custom filters extensible
	addFilters( markupFilters( res ) )
	addFilters( CSharp.markupFilters( res ) );
	addFilters( FSharp.markupFilters( res ) );

	return res;

	function addFilters( fs: { [key: string]: (...args: any[]) => any }) {
		for ( var f in fs ) env.addFilter( f, fs[f] );
	}

	function cacheConfigPart( c: ConfigPart ): CachedConfigPart[] {
		return Object.keys( c || {} )
			.filter( c => !!c )
			.map( key => {
				let regex = new RegExp( key );
				let value = c[key];
				return {
					match: ( name: string ) => { var res = regex.test( name ); regex.test( '' ); return res; },
					fileName: value ? getTemplate( value.FileName ) : null,
					template: value ? getTemplate( value.Template ) : null
				};
			});
	}

	function getTemplate( tpl: string ) {
		log( () => "getTemplate: " + tpl );

		if ( tpl && tpl[0] === '@' ) {
			var file = host.ResolveRelativePath( tpl.substring( 1 ), host.ResolveRelativePath( config.ConfigDir, config.RootDir ) );
			tpl = host.FetchFile( file );
			if ( !tpl ) throw "Unable to load template from " + file;
		}

		return new Template( tpl, env );
	}

	function createLoader() : ILoader {
		return {
			getSource: ( name: string ) => {
				var path = host.ResolveRelativePath( name, config.RootDir );
				var src = host.FetchFile( path );
				if ( src === null || src === undefined ) throw new Error( "External template " + name + " could not be loaded (tried to look at " + path + ")." );
				return { src: src, path: path, noCache: true };
			}
		};
	}
}
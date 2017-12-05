import * as Nunjucks from 'nunjucks'
import { objName } from '../utils'
import { CachedConfig } from '../config'
import { ModuleElement, ModuleElementKind } from '../interfaces'

export function markupFilters( config: CachedConfig ): { [key: string]: (...args: any[]) => any } {
	return {
		nonempty: ( x: any[] ) => x && x.length,
		match: ( str: string, regex: string, flags: string ) => (regex && new RegExp(regex, flags).test( typeof str === "string" ? str : "" )) ? <any>str : false,
		regexReplace: ( str: string, regex: string, replacement: string, flags: string ) => regex ? ( str || "" ).replace( new RegExp( regex, flags ), replacement ) : "",

		typeName: objName,

		isType: ( t: ModuleElement ) => ( t && t.Kind === ModuleElementKind.Type ) ? <any>t : false,
		isClass: ( t: ModuleElement ) => ( t && t.Kind === ModuleElementKind.Class ) ? <any>t : false,

		// Usage: {{ somepath | getFileNameWithoutExtension }}
		getFileNameWithoutExtension: ( path: string ) => {
			if ( !path ) return path;

			var dir = config.Host.GetParentDirectory( path );
			var name = path.substring( ( dir == '.' || !dir ) ? 0 : dir.length + 1 );
			var nameParts = name.split( '.' );
			return nameParts.slice( 0, nameParts.length - 1 ).join( '.' );
		},

		// Usage: {{ somepath | pathRelativeTo("work") }}
		// For example:
		//		when "somepath" == "work/abc"
		//		then the result will be "abc"
		//
		//		when "somepath" == ""
		//		then the result will be ".."
		//
		//		when "somepath" == "work/x/y/z"
		//		then the result will be "x/y/z"
		pathRelativeTo: ( path: string, from: string ) => {
			if ( !path || !from ) return path;
			return config.Host.MakeRelativePath( from, path );
		},

		// Usage: {{ somepath | dirName }}
		// For example:
		//		when "somepath" == "work/abc"
		//		then the result will be "work"
		//
		//		when "somepath" == "work/abc/"
		//		then the result will be "work/abc"
		//
		//		when "somepath" == "work"
		//		then the result will be "" (empty string)
		dirName: ( path: string ) => {
			if ( !path ) return path;

			var dir = config.Host.GetParentDirectory( path );
			return dir === '.' ? '' : dir;
		}
	};
}

// This monkey-patch adds a special implicit "this" symbol to the nunjucks rendering context,
// which resolves to the current context object itself.
var nun = <any>Nunjucks;
var old = nun.runtime.contextOrFrameLookup;
nun.runtime.contextOrFrameLookup = function ( ctx: any, frame: any, name: string ) {
	if ( name === "this" ) return ctx.ctx;
	return old.apply( this, arguments );
};

// NOTE: I don't really understand how it works and what it's doing
// (I do have a vague idea, but not a precise one).
// I have merely managed to craft something that works based on example at http://mozilla.github.io/nunjucks/api.html#custom-tags
export class DummyTagExtension implements Nunjucks.Extension {
	tags = ["_"];

	parse( parser, nodes, lexer ) {
		parser.advanceAfterBlockEnd();
		return new nodes.Output( 0, 0, "" );
	}
}
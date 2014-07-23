/// <reference path="../../lib/linq/linq.d.ts" />
/// <reference path="../interfaces.ts" />

module erecruit.TsT {
	export function markupFilters( config: CachedConfig ): { [key: string]: Function } {
		return {
			nonempty: ( x: any[] ) => x && x.length,
			match: ( str: string, regex: string, flags: string ) => (regex && new RegExp(regex, flags).test( typeof str === "string" ? str : "" )) ? <any>str : false,
			regexReplace: ( str: string, regex: string, replacement: string, flags: string ) => regex ? ( str || "" ).replace( new RegExp( regex, flags ), replacement ) : "",

			typeName: erecruit.TsT.objName,

			isType: ( t: ModuleElement ) => ( t && t.Kind === erecruit.TsT.ModuleElementKind.Type ) ? <any>t : false,
			isClass: ( t: ModuleElement ) => ( t && t.Kind === erecruit.TsT.ModuleElementKind.Class ) ? <any>t : false,

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
	var nun = <any>nunjucks;
	var old = nun.runtime.contextOrFrameLookup;
	nun.runtime.contextOrFrameLookup = function ( ctx: any, frame: any, name: string ) {
		if ( name === "this" ) return ctx.ctx;
		return old.apply( this, arguments );
	};

	// NOTE: I don't really understand how it works and what it's doing
	// (I do have a vague idea, but not a precise one).
	// I have merely managed to craft something that works based on example at http://mozilla.github.io/nunjucks/api.html#custom-tags
	export class DummyTagExtension implements Nunjucks.IExtension {
		tags = ["_"];

		parse( parser: Nunjucks.Parser.IParser, nodes: Nunjucks.Parser.Nodes, lexer: Nunjucks.Parser.ILexer ) {
			parser.advanceAfterBlockEnd();
			return new nodes.Output( 0, 0, "" );
		}
	}
}
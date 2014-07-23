/// <reference path="../lib/jasmine/jasmine.d.ts" />
/// <reference path="../src/utils.ts" />

module erecruit.TsT.Tests {
	export var path = require( "path" );
	export var fs = require( "fs" );

	interface It { ( name: string, define: () => void ): void; }
	declare var GLOBAL: any;

	var groupStack: string[] = [];
	var fns = ["it", "fit", "xit"];
	var real: any = Enumerable.from( fns ).toObject( x => x, x => GLOBAL[x] );
	var override = () => fns.forEach( fn =>
		GLOBAL[fn] = ( name: string, define: () => void ) => {
			restore();
			real[fn]( groupStack.join( ' ' ) + ' ' + name, define );
			override();
		} );
	var restore = () => fns.forEach( fn => GLOBAL[fn] = real[fn] );

	export function group( name: string, define: () => void ) {
		groupStack.push( name );
		override();
		try {
			define();
		}
		finally {
			restore();
			groupStack.pop();
		}
	}

	var globalIndent = 0;

	( <any>jasmine ).StringPrettyPrinter.prototype.append = function ( value: string ) {
		var prefixNewLine = false;
		var suffixNewLine = false;

		if ( value === '{ ' || value === '[ ' ) {
			globalIndent++;
			suffixNewLine = true;
		}
		else if ( value === ' }' || value === ' ]' ) {
			globalIndent--;
			prefixNewLine = true;
		}

		var prefix = prefixNewLine ? '\r\n' + new Array( globalIndent + 1 ).join( '\t' ) : '';
		var suffix = suffixNewLine ? '\r\n' + new Array( globalIndent + 1 ).join( '\t' ) : '';
		this.string += prefix + value + suffix;
	};

	erecruit.TsT.log = erecruit.TsT.debug = () => { };

	export function renderTemplate( tpl: string, ctx: any, filters: { [key: string]: Function }) {
		var env = new nunjucks.Environment( [] );
		for ( var f in filters ) env.addFilter( f, filters[f] );
		return env.renderString( tpl, ctx );
	}
}
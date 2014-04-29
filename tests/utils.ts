/// <reference path="../lib/jasmine/jasmine.d.ts" />
/// <reference path="../src/utils.ts" />

module erecruit.TsT.Tests {

	var groupStack: string[] = [];
	var real: { [name: string]: ( name: string, define: () => void ) => void } = { it: it, fit: fit, xit: xit };
	var override = () => Enumerable.from( real ).forEach( x =>
		global[x.key] = ( name: string, define: () => void ) => x.value( groupStack.join( ' ' ) + name, define ) );
	var restore = () => Enumerable.from( real ).forEach( x => global[x.key] = x.value );

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
}
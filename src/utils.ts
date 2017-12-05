import * as Linq from 'linq-es2015'
import { Class, Type, ModuleElement, ModuleElementKind, PrimitiveType } from './interfaces'

export function linq<T>(xs: Iterable<T>) : Linq.Enumerable<T> {
	return Linq.from( xs || [] );
}

export function empty<T>() : Linq.Enumerable<T> {
	return Linq.from( [] );
}

export function objName( e: ModuleElement, safe: boolean = true ): string {
	if ( !e ) return undefined;

	function name( x: { Name: string } ) {
		if ( x ) return x.Name;
		if ( safe ) return '[type is being constructed]';
		throw "Cannot calculate name for a type, because the type is still being constructed";
	}

	var t = <Type>e, c = <Class>e;
	return c.Kind === ModuleElementKind.Class ? c.Name :
		( t.Enum && name( t.Enum() ) )
		|| ( t.GenericParameter && name( t.GenericParameter() ) )
		|| ( t.Interface && name( t.Interface() ) )
		|| ( t.PrimitiveType && PrimitiveType[t.PrimitiveType] )
		|| ( t.GenericInstantiation && objName( t.GenericInstantiation().Definition, safe ) );
}

export function merge( ...hashes: any[] ) {
	var destination = hashes[0] || {};
	for ( var i = 1; i < hashes.length; i++ ) {
		var source = hashes[i];
		for ( var property in source ) {
			if ( source.hasOwnProperty( property ) ) {
				destination[property] = source[property];
			}
		}
	}

	return destination;
};

var output = { log: true, debug: false };
export function suppressOutput() { output.log = output.debug = false; }
export function enableDebug() { output.debug = true; }

export function log( msg: () => string ) {
	output.log && console.log && console.log( msg() );
}

export function debug( msg: () => string ) {
	output.debug && console.debug && console.debug( msg() );
}